// SIMULATED — used when STRIPE_SECRET_KEY is not set. Set STRIPE_SECRET_KEY env var to use real Stripe.
import { Injectable } from '@nestjs/common';

@Injectable()
export class StripeSimulatedService {
  private payments = new Map<string, any>();

  async createPaymentIntent(amount: number, currency: string, metadata: any) {
    const id = `pi_${Math.random().toString(36).substr(2, 24)}`;
    const intent = {
      id,
      amount: Math.round(amount * 100),
      currency,
      status: 'requires_payment_method',
      client_secret: `${id}_secret_${Math.random().toString(36).substr(2, 24)}`,
      metadata,
      created: Date.now(),
    };
    this.payments.set(id, intent);
    return intent;
  }

  async confirmPayment(paymentIntentId: string) {
    const intent = this.payments.get(paymentIntentId);
    if (!intent) return null;
    intent.status = 'succeeded';
    this.payments.set(paymentIntentId, intent);
    return intent;
  }

  async createRefund(paymentIntentId: string, amount?: number) {
    const original = this.payments.get(paymentIntentId);
    if (!original) return null;
    const refundId = `re_${Math.random().toString(36).substr(2, 24)}`;
    return {
      id: refundId,
      amount: amount ? Math.round(amount * 100) : original.amount,
      status: 'succeeded',
      paymentIntentId,
    };
  }

  constructWebhookEvent(payload: string, signature: string) {
    return { type: 'payment_intent.succeeded', data: { object: {} } };
  }
}
