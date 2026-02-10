import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'BASIC', enum: ['BASIC', 'DESTAQUE', 'PREMIUM'] })
  @IsString()
  @IsIn(['BASIC', 'DESTAQUE', 'PREMIUM'])
  planId: string;

  @ApiProperty({ example: 'https://app.adopet.com.br/partner/success', description: 'URL para redirecionar após pagamento aprovado' })
  @IsString()
  successUrl: string;

  @ApiProperty({ example: 'https://app.adopet.com.br/partner/cancel', description: 'URL para redirecionar se cancelar' })
  @IsString()
  cancelUrl: string;
}
