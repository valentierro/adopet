import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreferencesResponseDto {
  @ApiProperty({ enum: ['DOG', 'CAT', 'BOTH'] })
  species: string;

  @ApiProperty()
  radiusKm: number;

  @ApiPropertyOptional({ description: 'Preferência de tamanho: BOTH | small | medium | large | xlarge' })
  sizePref?: string | null;

  @ApiPropertyOptional({ description: 'Preferência de sexo do pet: BOTH | male | female' })
  sexPref?: string | null;

  @ApiPropertyOptional({ description: 'Preferência de castração: BOTH = indiferente, YES = prefiro castrado, NO = aceito não castrado' })
  neuteredPref?: string | null;

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

  @ApiProperty({ description: 'Receber lembretes para atualizar anúncios (a cada ~30 dias)' })
  notifyListingReminders: boolean;

  @ApiProperty({ description: 'Percentual de preenchimento das preferências usadas no match (0-100)' })
  completionPercent: number;

  @ApiProperty({
    description: 'Campos ainda não preenchidos (para exibir no tooltip)',
    type: 'array',
    items: { type: 'object', properties: { key: { type: 'string' }, label: { type: 'string' } } },
  })
  missingFields: { key: string; label: string }[];
}
