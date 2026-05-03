import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}

@Controller('payments')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    @Inject('StripeService') private readonly stripeService: { constructWebhookEvent(payload: string, signature: string): WebhookEvent | Promise<WebhookEvent> },
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const payload = req.rawBody;

    if (!payload) {
      this.logger.error('No raw body found — ensure raw body middleware is configured in main.ts');
      throw new BadRequestException('Missing raw body');
    }

    if (!signature) {
      this.logger.warn('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: WebhookEvent;

    try {
      event = this.stripeService.constructWebhookEvent(
        payload.toString('utf8'),
        signature,
      ) as WebhookEvent;
    } catch (err) {
      this.logger.error({ err }, 'Stripe signature verification failed');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log({
      eventId: event.id,
      eventType: event.type,
      created: new Date(event.created * 1000).toISOString(),
    }, 'Stripe webhook received');

    // Respond to Stripe immediately — process asynchronously
    setImmediate(() => this.processEvent(event));

    return { received: true };
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as {
            id: string;
            metadata?: { tenantId?: string; orderId?: string };
          };
          this.logger.log({ paymentIntentId: pi.id }, 'Payment succeeded');
          // Update payment status to COMPLETED by stripe payment intent id
          if (pi.metadata?.tenantId && pi.metadata?.orderId) {
            await this.paymentsService.updatePaymentStatusByStripeId(
              pi.metadata.tenantId,
              pi.id,
              'COMPLETED',
            );
          }
          break;
        }

        case 'payment_intent.failed': {
          const pi = event.data.object as {
            id: string;
            metadata?: { tenantId?: string; orderId?: string };
            last_payment_error?: { message?: string };
          };
          this.logger.warn(
            { paymentIntentId: pi.id, error: pi.last_payment_error?.message },
            'Payment failed',
          );
          if (pi.metadata?.tenantId && pi.metadata?.orderId) {
            await this.paymentsService.updatePaymentStatusByStripeId(
              pi.metadata.tenantId,
              pi.id,
              'FAILED',
            );
          }
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as {
            id: string;
            payment_intent?: string;
            amount?: number;
            currency?: string;
          };
          this.logger.log(
            { chargeId: charge.id, paymentIntentId: charge.payment_intent, amount: charge.amount },
            'Charge refunded',
          );
          // Log refund to DB — find payment by stripe payment intent
          if (charge.payment_intent) {
            await this.paymentsService.logRefundByStripePaymentIntent(charge.payment_intent);
          }
          break;
        }

        default:
          this.logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
      }
    } catch (err) {
      this.logger.error({ err, eventType: event.type }, 'Failed to process webhook event');
    }
  }
}