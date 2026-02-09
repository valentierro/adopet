import { ApiProperty } from '@nestjs/swagger';

export class TutorStatsResponseDto {
  @ApiProperty({ example: 85 })
  points: number;

  @ApiProperty({ example: 'TRUSTED', enum: ['BEGINNER', 'ACTIVE', 'TRUSTED', 'STAR', 'GOLD'] })
  level: string;

  @ApiProperty({ example: 'Tutor Confiável' })
  title: string;

  @ApiProperty({ example: 2, description: 'Quantidade de pets com selo de verificação' })
  verifiedCount: number;

  @ApiProperty({ example: 1, description: 'Quantidade de pets adotados' })
  adoptedCount: number;
}
