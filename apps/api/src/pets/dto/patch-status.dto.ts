import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class PatchStatusDto {
  @ApiProperty({ enum: ['AVAILABLE', 'IN_PROCESS', 'ADOPTED'] })
  @IsIn(['AVAILABLE', 'IN_PROCESS', 'ADOPTED'])
  status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED';

  @ApiPropertyOptional({ description: 'ID do usuário adotante indicado pelo tutor (deve ter conversa sobre este pet ou ser encontrado por @username)' })
  @IsOptional()
  @IsUUID()
  pendingAdopterId?: string;

  @ApiPropertyOptional({ description: 'Username do adotante (ex.: maria.silva) para resolver a quem atribuir; usado quando não há conversa no app' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  pendingAdopterUsername?: string;
}
