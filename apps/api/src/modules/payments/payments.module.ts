import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeSimulatedService } from './stripe.service';
import { StripeRealService } from './stripe-real.service';
import { PrismaService } from '../../database/prisma.service';

const stripeServiceProvider = {
  provide: 'StripeService',
  useFactory: () => {
    if (process.env.STRIPE_SECRET_KEY) {
      return new StripeRealService();
    }
    return new StripeSimulatedService();
  },
};

@Module({
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService, stripeServiceProvider, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
