import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreferencesResponseDto {
  @ApiProperty({ enum: ['DOG', 'CAT', 'BOTH'] })
  species: string;

  @ApiProperty()
  radiusKm: number;

  @ApiPropertyOptional({ description: 'Preferência de tamanho: BOTH | small | medium | large | xlarge' })
  sizePref?: string | null;

  @ApiPropertyOptional()
  latitude?: number | null;

  @ApiPropertyOptional()
  longitude?: number | null;

  @ApiProperty({ description: 'Receber push de novos pets' })
  notifyNewPets: boolean;

  @ApiProperty({ description: 'Receber push de mensagens e novas conversas' })
  notifyMessages: boolean;

  @ApiProperty({ description: 'Receber lembretes de conversas pendentes' })
  notifyReminders: boolean;
}
