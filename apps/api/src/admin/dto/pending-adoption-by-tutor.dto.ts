import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PendingAdoptionByTutorDto {
  @ApiProperty()
  petId: string;

  @ApiProperty({ example: 'Rex' })
  petName: string;

  @ApiProperty()
  tutorId: string;

  @ApiProperty({ example: 'Maria Silva' })
  tutorName: string;

  @ApiProperty({ example: '2025-02-08T12:00:00.000Z', description: 'Quando o tutor marcou o pet como adotado' })
  markedAt: string;

  @ApiProperty({
    example: '2025-02-10T12:00:00.000Z',
    description: 'Se não houver validação manual, o sistema auto-valida nesta data (48h após markedAt)',
    required: false,
  })
  autoApproveAt?: string;

  @ApiPropertyOptional({ description: 'Adotante indicado pelo tutor ao marcar como adotado' })
  pendingAdopterId?: string;

  @ApiPropertyOptional({ description: 'Nome do adotante indicado pelo tutor' })
  pendingAdopterName?: string;

  @ApiPropertyOptional({ description: 'Username do adotante indicado (ex.: maria.silva)' })
  pendingAdopterUsername?: string;

  @ApiPropertyOptional({
    description: 'Quando o adotante confirmou no app que realizou a adoção; só então entra no fluxo de validação/admin',
  })
  adopterConfirmedAt?: string;
}
