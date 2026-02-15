import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/** Aceita qualquer UUID (v1–5 e ids do seed como 11111111-1111-1111-1111-111111111111). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PatchStatusDto {
  @ApiProperty({ enum: ['AVAILABLE', 'IN_PROCESS', 'ADOPTED'] })
  @IsIn(['AVAILABLE', 'IN_PROCESS', 'ADOPTED'])
  status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';

  @ApiPropertyOptional({ description: 'ID do usuário adotante indicado pelo tutor (deve ter conversa sobre este pet ou ser encontrado por @username)' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @Matches(UUID_REGEX, { message: 'O ID do adotante não é válido. Selecione novamente na lista, busque por @usuário ou use "Outra pessoa".' })
  pendingAdopterId?: string;

  @ApiPropertyOptional({ description: 'Username do adotante (ex.: maria.silva) para resolver a quem atribuir; usado quando não há conversa no app' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsString()
  @MinLength(2)
  pendingAdopterUsername?: string;
}
