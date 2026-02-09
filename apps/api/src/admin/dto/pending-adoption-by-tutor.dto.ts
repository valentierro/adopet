import { ApiProperty } from '@nestjs/swagger';

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
}
