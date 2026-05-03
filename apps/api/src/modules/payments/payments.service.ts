import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StripeService } from './stripe.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async processPayment(tenantId: string, dto: { orderId: string; amount: number; tip?: number; method: string }) {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, tenantId } });
    if (!order) throw new BadRequestException('Order not found');

    const tipAmount = dto.tip || 0;
    const totalAmount = Number(order.total) + tipAmount;

    const stripeIntent = await this.stripeService.createPaymentIntent(totalAmount, 'usd', {
      tenantId,
      orderId: dto.orderId,
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId: dto.orderId,
        amount: order.total,
        tip: tipAmount,
        total: totalAmount,
        method: dto.method as any,
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: stripeIntent.id,
      },
    });

    await this.stripeService.confirmPayment(stripeIntent.id);
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.COMPLETED, processedAt: new Date() },
    });

    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: 'COMPLETED', tip: tipAmount },
    });

    return this.prisma.payment.findUnique({ where: { id: payment.id } });
  }

  async processRefund(tenantId: string, paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new BadRequestException('Payment not found');

    const refundResult = await this.stripeService.createRefund(payment.stripePaymentIntentId!, amount);
    if (!refundResult) throw new BadRequestException('Refund failed — payment intent not found in Stripe');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  async getPayments(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { order: { include: { table: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePaymentStatusByStripeId(
    tenantId: string,
    stripePaymentIntentId: string,
    status: 'COMPLETED' | 'FAILED',
  ) {
    return this.prisma.payment.updateMany({
      where: { tenantId, stripePaymentIntentId },
      data: {
        status: status as PaymentStatus,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  async logRefundByStripePaymentIntent(stripePaymentIntentId: string) {
    // Find the payment and update its status to REFUNDED
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId },
    });
    if (!payment) return null;

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }
}
