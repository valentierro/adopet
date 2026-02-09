import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsNumber, Min, Max, IsBoolean, IsLatitude, IsLongitude, ValidateIf, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ['DOG', 'CAT', 'BOTH'] })
  @IsOptional()
  @IsIn(['DOG', 'CAT', 'BOTH'])
  species?: 'DOG' | 'CAT' | 'BOTH';

  @ApiPropertyOptional({ description: 'Raio em km (1-500)', minimum: 1, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Preferência de tamanho para recomendação: BOTH | small | medium | large | xlarge' })
  @IsOptional()
  @IsString()
  @IsIn(['BOTH', 'small', 'medium', 'large', 'xlarge'])
  sizePref?: string | null;

  @ApiPropertyOptional({ description: 'Latitude para notificação "novos pets na região"' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ description: 'Longitude para notificação "novos pets na região"' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @IsLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({ description: 'Receber push de novos pets' })
  @IsOptional()
  @IsBoolean()
  notifyNewPets?: boolean;

  @ApiPropertyOptional({ description: 'Receber push de mensagens e novas conversas' })
  @IsOptional()
  @IsBoolean()
  notifyMessages?: boolean;

  @ApiPropertyOptional({ description: 'Receber lembretes de conversas pendentes' })
  @IsOptional()
  @IsBoolean()
  notifyReminders?: boolean;
}
