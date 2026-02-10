import { ApiProperty } from '@nestjs/swagger';

export class PublicStatsDto {
  @ApiProperty({ description: 'Total de adoções realizadas pela plataforma' })
  totalAdoptions: number;

  @ApiProperty({ description: 'Total de usuários cadastrados' })
  totalUsers: number;

  @ApiProperty({ description: 'Total de pets com anúncio aprovado no feed' })
  totalPets: number;
}
