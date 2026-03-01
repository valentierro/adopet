import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class SendFormDto {
  @ApiProperty({ description: 'ID da conversa com o interessado' })
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ description: 'ID do template de formulário (usa padrão do parceiro se omitido)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}
