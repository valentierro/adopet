import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ description: 'Total de adoções registradas' })
  totalAdoptions: number;

  @ApiProperty({ description: 'Adoções realizadas no mês atual' })
  adoptionsThisMonth: number;

  @ApiProperty({ description: 'Anúncios pendentes de moderação' })
  pendingPetsCount: number;

  @ApiProperty({ description: 'Denúncias não resolvidas' })
  pendingReportsCount: number;

  @ApiProperty({ description: 'Pets marcados como adotados pelo tutor (ainda não registrados pela admin)' })
  pendingAdoptionsByTutorCount: number;

  @ApiProperty({ description: 'Solicitações de verificação (selo) pendentes' })
  pendingVerificationsCount: number;
}
