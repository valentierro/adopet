import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  petId: string;

  /** Quando informado, o chamador deve ser o dono do pet; inicia conversa com este adotante (que deve ter favoritado o pet). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  adopterId?: string;
}
