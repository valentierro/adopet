import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateBugReportDto {
  @ApiProperty({ description: 'Mensagem do erro (ex.: exceção não tratada)' })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'Stack trace ou resumo técnico' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  stack?: string;

  @ApiPropertyOptional({ description: 'Tela/rota onde ocorreu (ex.: feed, pet/123)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  screen?: string;

  @ApiPropertyOptional({ description: 'Comentário opcional do usuário ao reportar' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  userComment?: string;
}
