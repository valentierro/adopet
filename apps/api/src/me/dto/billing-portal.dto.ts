import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateBillingPortalSessionDto {
  @ApiProperty({ example: 'https://app.adopet.com.br/partner-subscription', description: 'URL para redirecionar após sair do portal Stripe' })
  @IsString()
  returnUrl: string;
}
