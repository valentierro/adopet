import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
  @ApiProperty({ example: 'Rex' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'dog', enum: ['dog', 'cat'] })
  @IsString()
  @IsIn(['dog', 'cat'])
  species: string;

  @ApiPropertyOptional({ example: 'Golden Retriever', description: 'Raça (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  breed?: string;

  @ApiProperty({ example: 2, minimum: 0, maximum: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  age: number;

  @ApiProperty({ example: 'male', enum: ['male', 'female'] })
  @IsString()
  @IsIn(['male', 'female'])
  sex: string;

  @ApiProperty({ example: 'medium', enum: ['small', 'medium', 'large', 'xlarge'] })
  @IsString()
  @IsIn(['small', 'medium', 'large', 'xlarge'])
  size: string;

  @ApiProperty()
  @IsBoolean()
  vaccinated: boolean;

  @ApiProperty()
  @IsBoolean()
  neutered: boolean;

  @ApiProperty({ example: 'Cão dócil e brincalhão.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: 'Mudança de cidade', description: 'Por que está doando (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adoptionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  /** Para testes: URL de imagem placeholder quando o pet é cadastrado sem fotos. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'ID do parceiro (ONG) quando o anúncio é em parceria' })
  @IsOptional()
  @IsString()
  partnerId?: string;
}
