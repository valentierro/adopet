import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength, MinLength } from 'class-validator';

export class CreatePartnerRecommendationDto {
  @ApiProperty({ description: 'Nome do estabelecimento ou ONG indicado' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  suggestedName: string;

  @ApiProperty({ description: 'Tipo: ONG, CLINIC ou STORE', enum: ['ONG', 'CLINIC', 'STORE'] })
  @IsString()
  @IsIn(['ONG', 'CLINIC', 'STORE'])
  suggestedType: string;

  @ApiPropertyOptional({ description: 'Cidade do indicado' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  suggestedCity?: string;

  @ApiPropertyOptional({ description: 'E-mail de contato do indicado' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  suggestedEmail?: string;

  @ApiPropertyOptional({ description: 'Telefone de contato do indicado' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  suggestedPhone?: string;

  @ApiPropertyOptional({ description: 'Comentário ou motivo da indicação' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
