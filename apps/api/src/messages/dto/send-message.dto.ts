import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({ example: 'Olá! O pet ainda está disponível?' })
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(2000)
  @ValidateIf((o) => !o.imageUrl)
  content?: string;

  @ApiPropertyOptional({ description: 'URL ou path da imagem enviada no chat (upload prévio)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;
}
