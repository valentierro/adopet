import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength, IsUrl, IsBoolean, Matches } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ enum: ['CASA', 'APARTAMENTO'] })
  @IsOptional()
  @IsString()
  housingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasYard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasOtherPets?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasChildren?: boolean;

  @ApiPropertyOptional({ enum: ['MOST_DAY', 'HALF_DAY', 'LITTLE'] })
  @IsOptional()
  @IsString()
  timeAtHome?: string;

  @ApiPropertyOptional({ example: 'maria.silva', description: 'Nome de usuário único (@nome) para ser encontrado na hora de indicar adotante' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(/^[a-z0-9._]+$/, { message: 'Use apenas letras minúsculas, números, ponto e underscore' })
  username?: string;
}
