import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecentAdoptionItemDto {
  @ApiProperty({ description: 'ID do pet adotado' })
  petId: string;

  @ApiProperty({ description: 'Nome do pet' })
  petName: string;

  @ApiProperty({ description: 'Espécie (DOG | CAT)' })
  species: string;

  @ApiProperty({ description: 'Data em que a adoção foi registrada', example: '2025-02-08T14:00:00.000Z' })
  adoptedAt: string;

  @ApiPropertyOptional({ description: 'Cidade do anúncio (quando disponível)' })
  city?: string;

  @ApiPropertyOptional({ description: 'URL da foto principal do pet (quando disponível)' })
  photoUrl?: string;
}

export class RecentAdoptionsResponseDto {
  @ApiProperty({ type: [RecentAdoptionItemDto], description: 'Lista das últimas adoções realizadas no app' })
  items: RecentAdoptionItemDto[];
}
