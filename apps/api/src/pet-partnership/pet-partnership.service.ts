import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { VerificationService } from '../verification/verification.service';

const MAX_PARTNERS_PER_PET = 5;

export type PetPartnershipRequestItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  requestedByName: string;
  requestedAt: string;
};

export type PetPartnershipItem = {
  id: string;
  petId: string;
  petName: string;
  petPhotoUrl: string | null;
  confirmedAt: string;
  /** True quando o dono do anúncio é o admin ou um membro da própria ONG; o admin não deve ver "Encerrar parceria" nesses casos. */
  ownerIsMemberOfPartner: boolean;
};

@Injectable()
export class PetPartnershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationsService,
    private readonly verificationService: VerificationService,
  ) {}

  /** Retorna o partnerId do usuário (dono do parceiro ou membro da ONG). Null se não for parceiro nem membro. */
  async getPartnerIdForUser(userId: string): Promise<string | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (partner) return partner.id;
    const membership = await this.prisma.partnerMember.findFirst({
      where: { userId },
      select: { partnerId: true },
    });
    return membership?.partnerId ?? null;
  }

  /** Verifica se o usuário é membro do parceiro (ONG). */
  async isUserMemberOfPartner(userId: string, partnerId: string): Promise<boolean> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { userId: true },
    });
    if (partner?.userId === userId) return true;
    const member = await this.prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId, userId } },
    });
    return !!member;
  }

  /**
   * Sincroniza parcerias do pet com a lista desejada de partnerIds.
   * - Valida parceiros (ONG, ativo, aprovado); limite MAX_PARTNERS_PER_PET.
   * - Se o owner é membro da ONG → cria CONFIRMED (auto-confirmado).
   * - Senão → cria PENDING e notifica o parceiro (admin + membros).
   * - Parcerias existentes que não estão em partnerIds: se PENDING, remove; se CONFIRMED, não remove (só parceiro pode cancelar).
   */
  async syncPetPartnerships(petId: string, ownerId: string, partnerIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(partnerIds)].filter(Boolean);
    if (uniqueIds.length > MAX_PARTNERS_PER_PET) {
      throw new BadRequestException(`Máximo de ${MAX_PARTNERS_PER_PET} parceiros por anúncio.`);
    }
    const partners = await this.prisma.partner.findMany({
      where: {
        id: { in: uniqueIds },
        type: 'ONG',
        active: true,
        approvedAt: { not: null },
      },
      select: { id: true },
    });
    const validIds = new Set(partners.map((p) => p.id));
    const invalid = uniqueIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException('Parceiro(s) inválido(s) ou não aprovados. Escolha ONGs da lista.');
    }
    const memberOfPartnerIds = new Set<string>();
    for (const pid of validIds) {
      const isMember = await this.isUserMemberOfPartner(ownerId, pid);
      if (isMember) memberOfPartnerIds.add(pid);
    }
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { name: true },
    });
    const petName = pet?.name ?? 'Pet';
    const existing = await this.prisma.petPartnership.findMany({
      where: { petId },
      select: { id: true, partnerId: true, status: true },
    });
    const existingByPartner = new Map(existing.map((e) => [e.partnerId, e]));
    const desiredSet = new Set(validIds);

    for (const partnerId of validIds) {
      const ex = existingByPartner.get(partnerId);
      const isMember = memberOfPartnerIds.has(partnerId);
      if (ex) {
        if (ex.status === 'CANCELLED') {
          await this.prisma.petPartnership.update({
            where: { id: ex.id },
            data: {
              status: isMember ? 'CONFIRMED' : 'PENDING',
              confirmedById: isMember ? ownerId : null,
              confirmedAt: isMember ? new Date() : null,
              cancelledAt: null,
              cancelledById: null,
            },
          });
          if (!isMember) {
            await this.notifyPartnerNewRequest(partnerId, petId, petName, ownerId);
          }
        }
        continue;
      }
      await this.prisma.petPartnership.create({
        data: {
          petId,
          partnerId,
          status: isMember ? 'CONFIRMED' : 'PENDING',
          requestedById: ownerId,
          ...(isMember && { confirmedById: ownerId, confirmedAt: new Date() }),
        },
      });
      if (!isMember) {
        await this.notifyPartnerNewRequest(partnerId, petId, petName, ownerId);
      }
    }

    for (const ex of existing) {
      if (!desiredSet.has(ex.partnerId) && ex.status === 'PENDING') {
        await this.prisma.petPartnership.update({
          where: { id: ex.id },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: ownerId },
        });
      }
    }
  }

  private async notifyPartnerNewRequest(
    partnerId: string,
    petId: string,
    petName: string,
    requestedById: string,
  ): Promise<void> {
    const [partner, requester] = await Promise.all([
      this.prisma.partner.findUnique({
        where: { id: partnerId },
        select: { name: true, userId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: requestedById },
        select: { name: true },
      }),
    ]);
    if (!partner || !partner.userId) return;
    const title = 'Solicitação de parceria no anúncio';
    const body = `${requester?.name ?? 'Alguém'} solicitou exibir o selo da ${partner.name} no anúncio de ${petName}. Confirme ou rejeite no portal do parceiro.`;
    const metadata = { petId, partnerId };
    const pushData = { screen: 'partnerPortal', petId };
    this.inAppNotifications
      .create(partner.userId, IN_APP_NOTIFICATION_TYPES.PET_PARTNERSHIP_REQUEST, title, body, metadata, pushData)
      .catch((e) => console.warn('[PetPartnershipService] notifyPartnerNewRequest failed', e));
  }

  /** Lista solicitações pendentes do parceiro do usuário. */
  async listPendingRequestsForPartner(partnerId: string): Promise<PetPartnershipRequestItem[]> {
    const list = await this.prisma.petPartnership.findMany({
      where: { partnerId, status: 'PENDING' },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
        requestedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((pp) => ({
      id: pp.id,
      petId: pp.pet.id,
      petName: pp.pet.name,
      petPhotoUrl: pp.pet.media[0]?.url ?? null,
      requestedByName: pp.requestedBy.name,
      requestedAt: pp.createdAt.toISOString(),
    }));
  }

  /** Confirma uma solicitação de parceria. Apenas quem administra o parceiro. */
  async confirmRequest(partnershipId: string, userId: string): Promise<PetPartnershipItem> {
    const pp = await this.prisma.petPartnership.findUnique({
      where: { id: partnershipId },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
        partner: { select: { id: true, name: true, type: true } },
      },
    });
    if (!pp || pp.status !== 'PENDING') throw new NotFoundException('Solicitação não encontrada ou já respondida.');
    const partnerId = await this.getPartnerIdForUser(userId);
    if (partnerId !== pp.partnerId) throw new ForbiddenException('Você não pode confirmar esta solicitação.');
    const now = new Date();
    await this.prisma.petPartnership.update({
      where: { id: partnershipId },
      data: { status: 'CONFIRMED', confirmedById: userId, confirmedAt: now },
    });
    if (pp.partner.type === 'ONG') {
      await this.verificationService.autoVerifyPetForOng(pp.pet.id, pp.pet.ownerId);
    }
    this.inAppNotifications
      .create(
        pp.pet.ownerId,
        IN_APP_NOTIFICATION_TYPES.PET_PARTNERSHIP_CONFIRMED,
        'Parceria aprovada',
        `A ${pp.partner.name} aprovou a parceria no anúncio de ${pp.pet.name}. O selo já aparece no anúncio.`,
        { petId: pp.pet.id, partnershipId },
        { screen: 'pet', petId: pp.pet.id },
      )
      .catch((e) => console.warn('[PetPartnershipService] notify owner confirm failed', e));
    const ownerIsMemberOfPartner = await this.isUserMemberOfPartner(pp.pet.ownerId, pp.partnerId);
    return {
      id: pp.id,
      petId: pp.pet.id,
      petName: pp.pet.name,
      petPhotoUrl: pp.pet.media[0]?.url ?? null,
      confirmedAt: now.toISOString(),
      ownerIsMemberOfPartner,
    };
  }

  /** Rejeita uma solicitação de parceria. */
  async rejectRequest(partnershipId: string, userId: string): Promise<void> {
    const pp = await this.prisma.petPartnership.findUnique({
      where: { id: partnershipId },
      include: { pet: { select: { id: true, name: true, ownerId: true } }, partner: { select: { name: true } } },
    });
    if (!pp || pp.status !== 'PENDING') throw new NotFoundException('Solicitação não encontrada ou já respondida.');
    const partnerId = await this.getPartnerIdForUser(userId);
    if (partnerId !== pp.partnerId) throw new ForbiddenException('Você não pode rejeitar esta solicitação.');
    const now = new Date();
    await this.prisma.petPartnership.update({
      where: { id: partnershipId },
      data: { status: 'CANCELLED', cancelledAt: now, cancelledById: userId },
    });
    this.inAppNotifications
      .create(
        pp.pet.ownerId,
        IN_APP_NOTIFICATION_TYPES.PET_PARTNERSHIP_REJECTED,
        'Parceria não aprovada',
        `A ${pp.partner.name} não aprovou a parceria no anúncio de ${pp.pet.name}.`,
        { petId: pp.pet.id },
        { screen: 'pet', petId: pp.pet.id },
      )
      .catch((e) => console.warn('[PetPartnershipService] notify owner reject failed', e));
  }

  /** Lista parcerias confirmadas do parceiro (anúncios em parceria). */
  async listConfirmedForPartner(partnerId: string): Promise<PetPartnershipItem[]> {
    const [list, partner, members] = await Promise.all([
      this.prisma.petPartnership.findMany({
        where: { partnerId, status: 'CONFIRMED' },
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
            },
          },
        },
        orderBy: { confirmedAt: 'desc' },
      }),
      this.prisma.partner.findUnique({
        where: { id: partnerId },
        select: { userId: true },
      }),
      this.prisma.partnerMember.findMany({
        where: { partnerId },
        select: { userId: true },
      }),
    ]);
    const adminUserId = partner?.userId ?? null;
    const memberUserIds = new Set(members.map((m) => m.userId));
    return list
      .filter((pp) => {
        const ownerId = pp.pet.ownerId;
        const ownerIsMemberOfPartner =
          (adminUserId != null && ownerId === adminUserId) || memberUserIds.has(ownerId);
        return !ownerIsMemberOfPartner;
      })
      .map((pp) => ({
        id: pp.id,
        petId: pp.pet.id,
        petName: pp.pet.name,
        petPhotoUrl: pp.pet.media[0]?.url ?? null,
        confirmedAt: pp.confirmedAt!.toISOString(),
        ownerIsMemberOfPartner: false as const,
      }));
  }

  /** Parceiro encerra a parceria (badge removido do anúncio). */
  async cancelPartnership(partnershipId: string, userId: string): Promise<void> {
    const pp = await this.prisma.petPartnership.findUnique({
      where: { id: partnershipId },
      include: { pet: { select: { id: true, name: true, ownerId: true } }, partner: { select: { name: true } } },
    });
    if (!pp || pp.status !== 'CONFIRMED') throw new NotFoundException('Parceria não encontrada ou já encerrada.');
    const partnerId = await this.getPartnerIdForUser(userId);
    if (partnerId !== pp.partnerId) throw new ForbiddenException('Você não pode encerrar esta parceria.');
    const now = new Date();
    await this.prisma.petPartnership.update({
      where: { id: partnershipId },
      data: { status: 'CANCELLED', cancelledAt: now, cancelledById: userId },
    });
    await this.inAppNotifications
      .create(
        pp.pet.ownerId,
        IN_APP_NOTIFICATION_TYPES.PET_PARTNERSHIP_CANCELLED_BY_PARTNER,
        'ONG encerrou a parceria',
        `A ${pp.partner.name} encerrou a parceria no anúncio de ${pp.pet.name}. O selo de parceiro foi removido do seu anúncio.`,
        { petId: pp.pet.id },
        { screen: 'pet', petId: pp.pet.id },
      )
      .catch((e) => console.warn('[PetPartnershipService] notify owner cancel failed', e));
  }

  /** Retorna parceiros confirmados para um pet (para montar badge no feed/detalhe). */
  async getConfirmedPartnersForPet(petId: string): Promise<Array<{ id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean; type: string }>> {
    const list = await this.prisma.petPartnership.findMany({
      where: { petId, status: 'CONFIRMED' },
      include: {
        partner: {
          select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true, type: true },
        },
      },
      orderBy: { confirmedAt: 'asc' },
    });
    return list.map((pp) => ({
      ...pp.partner,
      type: (pp.partner.type ?? 'ONG').toUpperCase(),
    }));
  }

  /** Retorna Set de petIds que possuem ao menos uma parceria PENDING (para admin: exibir "Parceria não confirmada"). */
  async getPetIdsWithPendingPartnership(petIds: string[]): Promise<Set<string>> {
    if (petIds.length === 0) return new Set();
    const list = await this.prisma.petPartnership.findMany({
      where: { petId: { in: petIds }, status: 'PENDING' },
      select: { petId: true },
      distinct: ['petId'],
    });
    return new Set(list.map((pp) => pp.petId));
  }

  /** Retorna mapa petId -> parceiros confirmados (para feed/listagens em lote). */
  async getConfirmedPartnersByPetIds(
    petIds: string[],
  ): Promise<Map<string, Array<{ id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean; type: string }>>> {
    if (petIds.length === 0) return new Map();
    const list = await this.prisma.petPartnership.findMany({
      where: { petId: { in: petIds }, status: 'CONFIRMED' },
      include: {
        partner: {
          select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true, type: true },
        },
      },
      orderBy: { confirmedAt: 'asc' },
    });
    const map = new Map<string, Array<{ id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean; type: string }>>();
    for (const pp of list) {
      const arr = map.get(pp.petId) ?? [];
      arr.push({
        ...pp.partner,
        type: (pp.partner.type ?? 'ONG').toUpperCase(),
      });
      map.set(pp.petId, arr);
    }
    return map;
  }
}
