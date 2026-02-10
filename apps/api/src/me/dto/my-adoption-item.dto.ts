import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyAdoptionItemDto {
  @ApiProperty({ description: 'ID da adoção' })
  adoptionId: string;

  @ApiProperty({ description: 'ID do pet' })
  petId: string;

  @ApiProperty({ description: 'Nome do pet' })
  petName: string;

  @ApiProperty({ example: 'dog', description: 'Espécie do pet' })
  species: string;

  @ApiProperty({ type: [String], description: 'URLs das fotos do pet' })
  photos: string[];

  @ApiProperty({ description: 'Data em que o usuário adotou o pet (ISO 8601)' })
  adoptedAt: string;

  @ApiProperty({ description: 'Nome do tutor no momento da adoção (ex-tutor do pet)' })
  tutorName: string;

  @ApiProperty({ description: 'True quando a adoção foi confirmada pelo Adopet' })
  confirmedByAdopet: boolean;

  @ApiPropertyOptional({ description: 'Se presente, a marcação de adoção foi rejeitada pelo Adopet (ISO 8601)' })
  adoptionRejectedAt?: string;
}

export class MyAdoptionsResponseDto {
  @ApiProperty({ type: [MyAdoptionItemDto] })
  items: MyAdoptionItemDto[];
}
