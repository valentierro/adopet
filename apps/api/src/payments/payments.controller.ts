import { Controller, Post, Req, Headers, RawBodyRequest, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('stripe-webhook')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Webhook Stripe (assinaturas). Chamado pelo Stripe, não pelo app.' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature');
    }
    const rawBody = (req as Request & { body: Buffer }).body;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Raw body required for webhook verification.');
    }
    await this.stripeService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
