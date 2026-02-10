import { Injectable, BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import type { PresignDto } from './dto/presign.dto';
import type { ConfirmUploadDto } from './dto/confirm.dto';
import type { PresignResponseDto } from './dto/presign-response.dto';

const DEFAULT_EXPIRES_IN = 600; // 10 min

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
}
