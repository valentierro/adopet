import { ApiProperty } from '@nestjs/swagger';

/** Contagens agregadas para relatório de pets/anúncios */
export class PetsReportAggregatesDto {
  @ApiProperty({ description: 'Total de pets cadastrados' })
  total: number;

  @ApiProperty({ example: { DOG: 120, CAT: 80 } })
  bySpecies: Record<string, number>;

  @ApiProperty({ example: { SRD: 50, 'Golden Retriever': 10 } })
  byBreed: Record<string, number>;

  @ApiProperty({ example: { male: 100, female: 100 } })
  bySex: Record<string, number>;

  @ApiProperty({ example: { 'São Paulo': 60, 'Rio de Janeiro': 40 } })
  byCity: Record<string, number>;

  @ApiProperty({ description: 'Faixas de idade: 0-1, 2-5, 6-10, 11+' })
  byAgeRange: Record<string, number>;

  @ApiProperty({ example: { PENDING: 5, APPROVED: 180, REJECTED: 15 } })
  byPublicationStatus: Record<string, number>;

  @ApiProperty({ example: { AVAILABLE: 150, IN_PROCESS: 20, ADOPTED: 30 } })
  byStatus: Record<string, number>;

  @ApiProperty({ description: 'Vacinados: true/false' })
  byVaccinated: Record<string, number>;

  @ApiProperty({ description: 'Castrados: true/false' })
  byNeutered: Record<string, number>;
}

/** Contagens agregadas para relatório de usuários */
export class UsersReportAggregatesDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ description: 'Cadastros por cidade' })
  byCity: Record<string, number>;

  @ApiProperty({ description: 'Cadastros por mês (YYYY-MM)' })
  byMonth: Record<string, number>;

  @ApiProperty({ description: 'KYC: null, PENDING, VERIFIED, REJECTED' })
  byKycStatus: Record<string, number>;

  @ApiProperty({ description: 'Usuários com pelo menos 1 anúncio' })
  withListings: number;

  @ApiProperty({ description: 'Usuários sem anúncios' })
  withoutListings: number;

  @ApiProperty({ description: 'Contas desativadas/banidas' })
  deactivated: number;
}

/** Contagens agregadas para relatório de adoções */
export class AdoptionsReportAggregatesDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ description: 'Adoções por mês (YYYY-MM)' })
  byMonth: Record<string, number>;

  @ApiProperty({ description: 'Por espécie do pet' })
  bySpecies: Record<string, number>;

  @ApiProperty({ description: 'Confirmadas pela Adopet' })
  confirmedByAdopet: number;

  @ApiProperty({ description: 'Não confirmadas pela Adopet' })
  notConfirmedByAdopet: number;
}
