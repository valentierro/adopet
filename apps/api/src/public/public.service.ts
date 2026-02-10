import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicStatsDto } from './dto/public-stats.dto';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<PublicStatsDto> {
    const [totalAdoptions, totalUsers, totalPets] = await Promise.all([
      this.prisma.adoption.count(),
      this.prisma.user.count(),
      this.prisma.pet.count({
        where: { publicationStatus: 'APPROVED' },
      }),
    ]);
    return { totalAdoptions, totalUsers, totalPets };
  }
}
