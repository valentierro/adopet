import { ApiProperty } from '@nestjs/swagger';

export class AdoptionItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  petId: string;

  @ApiProperty({ example: 'Rex' })
  petName: string;

  @ApiProperty()
  tutorId: string;

  @ApiProperty({ example: 'Maria Silva' })
  tutorName: string;

  @ApiProperty()
  adopterId: string;

  @ApiProperty({ example: 'João Santos' })
  adopterName: string;

  @ApiProperty({ example: '2025-02-08T12:00:00.000Z' })
  adoptedAt: string;

  /** true quando a Adopet confirmou (admin ou 48h); false quando só o adotante confirmou */
  @ApiProperty()
  confirmedByAdopet: boolean;
}
