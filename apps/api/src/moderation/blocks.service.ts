import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async block(blockerId: string, dto: CreateBlockDto): Promise<{ blocked: true }> {
    const { blockedUserId } = dto;
    if (blockerId === blockedUserId) {
      throw new ConflictException('Você não pode bloquear a si mesmo.');
    }
    const exists = await this.prisma.user.findUnique({ where: { id: blockedUserId } });
    if (!exists) throw new NotFoundException('Usuário não encontrado.');

    await this.prisma.block.upsert({
      where: {
        blockerId_blockedUserId: { blockerId, blockedUserId },
      },
      create: { blockerId, blockedUserId },
      update: {},
    });
    this.logger.log({
      event: 'user_blocked',
      blockerId,
      blockedUserId,
    });
    return { blocked: true };
  }

  async unblock(blockerId: string, blockedUserId: string): Promise<{ unblocked: true }> {
    const deleted = await this.prisma.block.deleteMany({
      where: { blockerId, blockedUserId },
    });
    if (deleted.count > 0) {
      this.logger.log({
        event: 'user_unblocked',
        blockerId,
        blockedUserId,
      });
    }
    return { unblocked: true };
  }

  /** IDs de usuários que o userId bloqueou. */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedUserId: true },
    });
    return rows.map((r) => r.blockedUserId);
  }

  /** IDs de usuários que bloquearam o userId. */
  async getBlockedByUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.block.findMany({
      where: { blockedUserId: userId },
      select: { blockerId: true },
    });
    return rows.map((r) => r.blockerId);
  }

  /** Verifica se blocker bloqueou blocked ou se blocked bloqueou blocker. */
  async isBlockedBetween(userIdA: string, userIdB: string): Promise<boolean> {
    const count = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: userIdA, blockedUserId: userIdB },
          { blockerId: userIdB, blockedUserId: userIdA },
        ],
      },
    });
    return count > 0;
  }
}
