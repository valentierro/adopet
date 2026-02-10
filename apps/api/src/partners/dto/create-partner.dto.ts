import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength, MinLength, IsBoolean } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ example: 'ONG', enum: ['ONG', 'CLINIC', 'STORE'] })
  @IsString()
  @IsIn(['ONG', 'CLINIC', 'STORE'])
  type: string;

  @ApiProperty({ example: 'Instituto Amor de Patas' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'instituto-amor-de-patas', description: 'Único na base; se omitido, gerado a partir do nome' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Se true, parceiro já fica aprovado ao criar' })
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional({ description: 'Parceria paga: destaque na lista e boost no feed' })
  @IsOptional()
  @IsBoolean()
  isPaidPartner?: boolean;
}
