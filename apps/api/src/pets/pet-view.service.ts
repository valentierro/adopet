import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PetViewService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra uma visualização do pet pelo usuário (upsert: atualiza viewedAt). */
  async recordView(petId: string, userId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, select: { id: true } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    await this.prisma.petView.upsert({
      where: { petId_userId: { petId, userId } },
      create: { petId, userId, viewedAt: new Date() },
      update: { viewedAt: new Date() },
    });
  }

  /**
   * Registra visualização quando o usuário abre o detalhe pela tela "Pets que passou".
   * Atualiza viewedAt e revisitedFromPassedAt (conta +1 por usuário na contagem; acessos repetidos não somam mais).
   */
  async recordViewFromPassedScreen(petId: string, userId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, select: { id: true } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    const now = new Date();
    await this.prisma.petView.upsert({
      where: { petId_userId: { petId, userId } },
      create: { petId, userId, viewedAt: now, revisitedFromPassedAt: now },
      update: { viewedAt: now, revisitedFromPassedAt: now },
    });
  }

  /**
   * Retorna a contagem de visualizações nas últimas 24h por pet.
   * Por usuário: 1 se teve viewedAt nas 24h; +1 se teve revisitedFromPassedAt nas 24h (máx. 2 por usuário).
   */
  async getViewCountsLast24h(petIds: string[]): Promise<Map<string, number>> {
    if (petIds.length === 0) return new Map();
    const since = new Date(Date.now() - VIEW_WINDOW_MS);
    const rows = await this.prisma.petView.findMany({
      where: {
        petId: { in: petIds },
        OR: [{ viewedAt: { gte: since } }, { revisitedFromPassedAt: { gte: since } }],
      },
      select: { petId: true, viewedAt: true, revisitedFromPassedAt: true },
    });
    const byPet = new Map<string, number>();
    for (const r of rows) {
      const contrib =
        (r.viewedAt >= since ? 1 : 0) + (r.revisitedFromPassedAt != null && r.revisitedFromPassedAt >= since ? 1 : 0);
      byPet.set(r.petId, (byPet.get(r.petId) ?? 0) + contrib);
    }
    return byPet;
  }
}
