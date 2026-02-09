import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ['USER', 'PET', 'MESSAGE'] })
  @IsString()
  @IsIn(['USER', 'PET', 'MESSAGE'])
  targetType: 'USER' | 'PET' | 'MESSAGE';

  @ApiProperty({ description: 'ID do usuário, pet ou mensagem denunciado' })
  @IsString()
  @MinLength(1)
  targetId: string;

  @ApiProperty({ example: 'SPAM', description: 'Motivo da denúncia' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  reason: string;

  @ApiPropertyOptional({ description: 'Descrição opcional' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
