import { Injectable, BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import type { PresignDto } from './dto/presign.dto';
import type { ConfirmUploadDto } from './dto/confirm.dto';
import type { PresignResponseDto } from './dto/presign-response.dto';

const DEFAULT_EXPIRES_IN = 600; // 10 min
const SIGNUP_KYC_PREFIX = 'signup-kyc/';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION') ?? 'us-east-1';
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'adopet';
    this.publicBase = this.config.get<string>('S3_PUBLIC_BASE') ?? '';

    this.s3 = new S3Client({
      region,
      ...(endpoint && {
        endpoint,
        forcePathStyle: true,
      }),
      credentials: this.config.get<string>('S3_ACCESS_KEY')
        ? {
            accessKeyId: this.config.get<string>('S3_ACCESS_KEY')!,
            secretAccessKey: this.config.get<string>('S3_SECRET_KEY')!,
          }
        : undefined,
    });
  }

  async presign(userId: string, dto: PresignDto): Promise<PresignResponseDto> {
    if (!this.config.get<string>('S3_ACCESS_KEY') || !this.config.get<string>('S3_SECRET_KEY')) {
      throw new ServiceUnavailableException(
        'Upload de fotos não configurado. Configure S3 no servidor (veja .env.example).',
      );
    }

    const ext = dto.filename.replace(/^.*\./, '').toLowerCase();
    const contentType = dto.contentType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const key = `uploads/${userId}/${Date.now()}-${dto.filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: DEFAULT_EXPIRES_IN });
    const publicUrl = this.publicBase ? `${this.publicBase.replace(/\/$/, '')}/${key}` : key;

    return { uploadUrl, key, publicUrl };
  }

  /**
   * Presign para upload de documento KYC durante o cadastro (sem autenticação).
   * Chave no formato signup-kyc/{uuid}-{filename} para ser aceita no signup e associada ao usuário.
   */
  async presignSignupKyc(filename: string, contentType?: string): Promise<{ uploadUrl: string; key: string }> {
    if (!this.config.get<string>('S3_ACCESS_KEY') || !this.config.get<string>('S3_SECRET_KEY')) {
      throw new ServiceUnavailableException(
        'Upload de fotos não configurado. Configure S3 no servidor (veja .env.example).',
      );
    }
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'selfie.jpg';
    const ext = sanitized.replace(/^.*\./, '').toLowerCase();
    const finalFilename = ext && /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? sanitized : `${sanitized}.jpg`;
    const key = `${SIGNUP_KYC_PREFIX}${randomUUID()}-${finalFilename}`;
    const type = contentType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: type,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: DEFAULT_EXPIRES_IN });
    return { uploadUrl, key };
  }

  async confirm(userId: string, dto: ConfirmUploadDto): Promise<{ id: string; url: string }> {
    const pet = await this.prisma.pet.findUnique({ where: { id: dto.petId } });
    if (!pet) throw new BadRequestException('Pet não encontrado');
    if (pet.ownerId !== userId) throw new ForbiddenException('Só o dono do pet pode adicionar mídia');

    if (dto.isPrimary) {
      await this.prisma.petMedia.updateMany({
        where: { petId: dto.petId },
        data: { isPrimary: false },
      });
    }

    const count = await this.prisma.petMedia.count({ where: { petId: dto.petId } });
    const media = await this.prisma.petMedia.create({
      data: {
        petId: dto.petId,
        url: this.buildPublicUrl(dto.key),
        sortOrder: count,
        isPrimary: dto.isPrimary ?? count === 0,
      },
    });
    return { id: media.id, url: media.url };
  }

  /** Confirma upload de avatar: atualiza avatarUrl do usuário (key deve ser de uploads/{userId}/...). */
  async confirmAvatar(userId: string, key: string): Promise<{ avatarUrl: string }> {
    if (!key.startsWith(`uploads/${userId}/`)) {
      throw new ForbiddenException('Chave de upload inválida para avatar');
    }
    const avatarUrl = this.buildPublicUrl(key);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return { avatarUrl };
  }

  /** Confirma upload de logo do parceiro: atualiza logoUrl do estabelecimento (key de uploads/{userId}/...). */
  async confirmPartnerLogo(userId: string, key: string): Promise<{ logoUrl: string }> {
    if (!key.startsWith(`uploads/${userId}/`)) {
      throw new ForbiddenException('Chave de upload inválida para logo do parceiro');
    }
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new ForbiddenException('Parceiro não encontrado');
    const logoUrl = this.buildPublicUrl(key);
    await this.prisma.partner.update({
      where: { id: partner.id },
      data: { logoUrl },
    });
    return { logoUrl };
  }

  private buildPublicUrl(key: string): string {
    if (this.publicBase) return `${this.publicBase.replace(/\/$/, '')}/${key}`;
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    if (endpoint) return `${endpoint}/${this.bucket}/${key}`;
    return key;
  }

  /** Retorna URL pública (ou construída) para uma chave S3. Usado por admin para exibir documento/selfie do KYC. */
  getPublicUrl(key: string | null | undefined): string | null {
    if (!key?.trim()) return null;
    return this.buildPublicUrl(key.trim());
  }

  /**
   * Retorna buffer e content-type de um objeto no S3. Usado pelo GET serve para exibir fotos no app.
   */
  async getObjectWithType(key: string | null | undefined): Promise<{ buffer: Buffer; contentType: string } | null> {
    const k = key?.trim();
    if (!k) return null;
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: k });
      const response = await this.s3.send(cmd);
      const body = response.Body as { on?(e: string, fn: (...args: unknown[]) => void): void; once?(e: string, fn: (...args: unknown[]) => void): void } | undefined;
      if (!body?.on) return null;
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        body.on!('data', (chunk: Buffer) => chunks.push(chunk));
        body.once!('end', () => resolve());
        body.once!('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      const contentType = (response.ContentType as string) || 'application/octet-stream';
      return { buffer, contentType };
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  /**
   * Baixa o objeto do S3 e retorna o corpo como Buffer. Usado para processamento server-side (ex.: OCR no documento KYC).
   * Retorna null se a chave for vazia ou o objeto não existir.
   */
  async getObjectBuffer(key: string | null | undefined): Promise<Buffer | null> {
    const k = key?.trim();
    if (!k) return null;
    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: k });
      const response = await this.s3.send(cmd);
      const body = response.Body as { on?(e: string, fn: (...args: unknown[]) => void): void; once?(e: string, fn: (...args: unknown[]) => void): void } | undefined;
      if (!body?.on) return null;
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        body.on!('data', (chunk: Buffer) => chunks.push(chunk));
        body.once!('end', () => resolve());
        body.once!('error', reject);
      });
      return Buffer.concat(chunks);
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  /**
   * Remove um objeto do bucket S3 pela chave. Usado após decisão de KYC para não reter imagens (redução de risco jurídico).
   * Não lança erro se a chave for vazia ou se o objeto não existir (S3 retorna 204 em ambos os casos).
   */
  async deleteByKey(key: string | null | undefined): Promise<void> {
    const k = key?.trim();
    if (!k) return;
    try {
      const cmd = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: k,
      });
      type WithSend = { send(command: DeleteObjectCommand): Promise<unknown> };
      await (this.s3 as unknown as WithSend).send(cmd);
    } catch (err) {
      // Log mas não falha o fluxo; o importante é ter zerado a referência no banco
      console.warn(`[UploadsService] deleteByKey failed for key=${k}:`, err);
    }
  }
}
