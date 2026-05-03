# PROMPT FASE 9 — PAYMENTS (STRIPE) + MULTI-LOCATION

**Por qué es importante:** Phase 6 tenía payment processing simulado. Ahora integramos Stripe real para depósitos, pagos, propinas, y reembolsos. También multi-location para grupos de restaurantes.

---

## TAREA 1: Stripe Integration

```typescript
// payments/stripe.service.ts

import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia',
    });
  }

  // Payment Intent — para pagos en mesa
  async createPaymentIntent(amount: number, currency: string, metadata: {
    tenantId: string;
    orderId: string;
    guestId?: string;
  }) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  // Deposit — para reservas con depósito
  async createDepositIntent(amount: number, reservationId: string, tenantId: string) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { tenantId, reservationId, type: 'deposit' },
      capture_method: 'automatic',
    });
  }

  // Refund
  async refund(paymentIntentId: string, amount?: number) {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // partial refund
    });
  }

  // Webhook signature verification
  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }
}
```

**Endpoints:**
```
POST /api/v1/payments/stripe/create-intent  → crear PaymentIntent
POST /api/v1/payments/stripe/confirm        → confirmar pago (del frontend)
POST /api/v1/payments/stripe/deposit        → crear depósito para reserva
POST /api/v1/payments/stripe/refund         → reembolsar
POST /api/v1/payments/stripe/webhook        → Stripe webhook handler
```

**DTOs:**
```typescript
export class CreatePaymentIntentDto {
  @IsNumber() amount!: number;  // dollars
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() guestId?: string;
}

export class CreateDepositDto {
  @IsNumber() amount!: number;
  @IsUUID() reservationId!: string;
}

export class RefundDto {
  @IsString() paymentIntentId!: string;
  @IsOptional() @IsNumber() amount?: number;
}
```

**Verificación:**
- PaymentIntent creado → stripe_payment_intent_id en Payment record
- Webhook received → order status updated

---

## TAREA 2: Stripe Webhook Handler

```typescript
// payments/stripe-webhook.controller.ts

// Stripe sends events asynchronously
// Handle: payment_intent.succeeded, payment_intent.failed, charge.refunded

@Post('stripe-webhook')
async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: Buffer) {
  let event: Stripe.Event;

  try {
    event = this.stripeService.constructWebhookEvent(body, signature);
  } catch (err) {
    throw new BadRequestException('Webhook signature verification failed');
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.onPaymentSucceeded(pi);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await this.onPaymentFailed(pi);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await this.onChargeRefunded(charge);
      break;
    }
  }

  return { received: true };
}

async function onPaymentSucceeded(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata.orderId;
  if (!orderId) return;

  // Update Payment record
  await this.prisma.payment.updateMany({
    where: { stripePaymentIntentId: pi.id },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    }
  });

  // Update Order status
  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' }
  });

  // Trigger receipt email
  await this.queue.add('send-receipt', { orderId });
}
```

**Verificación:**
- payment_intent.succeeded → order status = COMPLETED
- Refund event → payment status = REFUNDED

---

## TAREA 3: Deposit for Reservations

```typescript
// Reservations con depósito (BookingType.DEPOSIT_REQUIRED)

async createDeposit(reservationId: string): Promise<string> {
  const reservation = await this.prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { tenant: true }
  });

  if (!reservation.depositRequired || reservation.depositPaid) {
    throw new BadRequestException('Deposit not required or already paid');
  }

  // Create Stripe PaymentIntent
  const intent = await this.stripeService.createDepositIntent(
    Number(reservation.depositAmount),
    reservationId,
    reservation.tenantId
  );

  // Guardar client_secret para frontend
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}
```

**Flow:**
1. Guest reserva → se le pide depósito
2. Frontend usa clientSecret → Stripe Elements confirma
3. Si succeeded → reservation.depositPaid = true, se notifica al guest
4. Si failed → reservation sigue pendiente, se avisa al guest

**Verificación:**
- Reserva con depósito → clientSecret devuelto
- Pago exitoso → depositPaid = true

---

## TAREA 4: Split Payments with Stripe

```typescript
// Split payment: una orden, múltiples PaymentIntents

async processSplitPayment(orderId: string, splits: SplitRequest) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });

  const paymentResults = [];
  for (const split of splits.splits) {
    const intent = await this.stripeService.createPaymentIntent(
      split.amount,
      'usd',
      { tenantId: order.tenantId, orderId, splitIndex: split.index }
    );

    // Guardar cada payment
    const payment = await this.prisma.payment.create({
      data: {
        tenantId: order.tenantId,
        orderId,
        amount: split.amount,
        tip: split.tip || 0,
        total: split.amount + (split.tip || 0),
        method: 'CARD',
        status: 'PENDING',
        stripePaymentIntentId: intent.id,
        splitOf: splits.splits.length > 1 ? `split_${orderId}` : null,
      }
    });

    paymentResults.push({ paymentId: payment.id, clientSecret: intent.client_secret });
  }

  return paymentResults;
}
```

**Verificación:**
- Split por seats → 3 PaymentIntents creados
- Todos los pagos completados → order COMPLETED

---

## TAREA 5: Tips with Stripe

```typescript
// Tip processing: el guest puede agregar tip en el momento del pago
// Stripe permite agregar tip como parte del PaymentIntent

async processTip(orderId: string, tipAmount: number) {
  // Buscar Payment relacionado (el PaymentIntent original)
  const payment = await this.prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' }
  });

  if (!payment?.stripePaymentIntentId) {
    throw new BadRequestException('No completed payment found for this order');
  }

  // Stripe: usar PaymentIntentUpdate para agregar tip
  // O crear charge adicional
  const charge = await this.stripe.charges.create({
    amount: Math.round(tipAmount * 100),
    currency: 'usd',
    source: payment.stripePaymentIntentId, // assumes saved card
    description: `Tip for order ${orderId}`,
  });

  // Update payment record
  await this.prisma.payment.update({
    where: { id: payment.id },
    data: { tip: tipAmount, total: Number(payment.amount) + tipAmount }
  });

  // Distribution de tips (ver Phase 6)
  await this.distributeTips(orderId, tipAmount);
}
```

**Verificación:**
- Tip procesado → payment.tip actualizado
- Tip distribution ejecutada

---

## TAREA 6: Multi-Location Model

```prisma
// Tenant ya existe, pero ahora necesitamos la jerarquía Restaurant Group

model RestaurantGroup {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenants   Tenant[]
}

model Tenant {
  // ... existing fields ...

  groupId   String?
  group     RestaurantGroup? @relation(fields: [groupId], references: [id])

  // Location-specific config
  locationName String?  // "RestaurantOS - Downtown"
  address      String?
  timezone     String   @default("America/New_York")

  // Para reporting
  currency     String   @default("USD")
}
```

**Migration:**
```bash
# Add groupId to Tenant, locationName, address, timezone, currency
npx prisma migrate dev --name add_restaurant_group
```

**Verificación:** migration exitosa, models actualizados

---

## TAREA 7: Multi-Location Endpoints

```typescript
// groups/restaurant-groups.controller.ts

// Admin endpoints para gestionar grupo

GET  /api/v1/groups                    → lista de grupos (Owner only)
POST /api/v1/groups                     → crear grupo
GET  /api/v1/groups/:groupId            → detalle del grupo
PATCH /api/v1/groups/:groupId           → actualizar

// Tenant management dentro del grupo
GET  /api/v1/groups/:groupId/locations  → todos los tenants del grupo
POST /api/v1/groups/:groupId/locations  → crear nuevo tenant (nuevo location)
GET  /api/v1/groups/:groupId/locations/:tenantId → detalle de un location

// Cross-location queries
GET /api/v1/groups/:groupId/analytics   → analytics agregados de todos los locations
GET /api/v1/groups/:groupId/guests      → guests compartidos entre locations
```

**Permissions:**
- OWNER of group → puede hacer todo
- MANAGER de un location específico → solo ese location

**Verificación:**
- Owner ve todos los locations
- Manager de Downtown no ve datos de Uptown

---

## TAREA 8: Shared Guest Profiles Across Locations

```typescript
// Guests pueden tener perfil en múltiples locations
// pero también pueden ser "linked" para grupo

model Guest {
  // ... existing fields ...

  // Link across locations
  linkedGuestId String?   // si este guest es la misma persona en otro location
  linkedGuest   Guest?   @relation("GuestLinks", { id: linkedGuestId })

  @@index([linkedGuestId])
}

// Guest link request
async linkGuestAcrossLocations(guestId: string, targetTenantId: string) {
  // 1. Verificar que el guest existe en el location actual
  // 2. Buscar si ya existe guest con mismo email/phone en target tenant
  // 3. Si existe → linkear
  // 4. Si no existe → crear linked guest
}
```

**Use case:**
- Guest dine en location A → tiene perfil
- Ahora también va a location B → linked profile, historial compartido
- Grupo ve al guest en ambos locations con historial completo

**Verificación:**
- Link guest → linkedGuestId guardado
- Query guest → incluye datos de locations vinculados

---

## TAREA 9: Multi-Location Analytics

```typescript
// Enhanced analytics para grupos

GET /api/v1/analytics/group/overview
GET /api/v1/analytics/group/comparison

interface GroupOverview {
  groupName: string;
  totalLocations: number;
  locations: {
    tenantId: string;
    name: string;
    revenueToday: number;
    coversToday: number;
    avgTicketTime: number;
  }[];
  totalRevenueToday: number;
  totalCoversToday: number;
  topLocation: string;
  bottomLocation: string;
}

interface GroupComparison {
  comparisons: {
    location1: string;
    location2: string;
    revenueDiff: number;
    coversDiff: number;
    avgTicketTimeDiff: number;
  }[];
}
```

**Verificación:**
- Group overview → revenue y covers agregados
- Location comparison → ranking claro

---

## TAREA 10: Payment Gateway Configuration

```typescript
// Cada location puede tener su propia Stripe config
// O usar Stripe Connect para subaccounts

model Tenant {
  // ... existing fields ...

  stripeAccountId String?  // Stripe Connect account (para receiving payouts)
  stripeWebhookSecret String?
}

// En pago: usar el stripeAccountId del tenant para recibir pagos
// Stripe Connect: dinero va directo al restaurant (menos fees)
```

**Verificación:**
- Payment → dinero va al stripe account del tenant
- Webhook → signature verificada con tenant-specific secret

---

## TAREA 11: Tests

```typescript
describe('PaymentsService', () => {
  it('should create Stripe PaymentIntent');
  it('should handle payment_intent.succeeded webhook');
  it('should handle payment_intent.payment_failed webhook');
  it('should process split payments across multiple intents');
  it('should add tip to existing payment');
  it('should process deposit for reservation');
  it('should not allow double-deposit');
  it('should refund via Stripe');
  it('should handle refund webhook');
});

describe('MultiLocationService', () => {
  it('should create restaurant group');
  it('should add location to group');
  it('should aggregate analytics across locations');
  it('should link guest across locations');
  it('should NOT leak data between locations');
  it('should respect per-location permissions');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 12: Payments UI

```
/payments                    → payment history
/payments/process            → payment terminal
/admin/stripe                → Stripe config
/admin/multi-location        → groups y locations
/admin/locations/new         → crear nuevo location
```

**Components:**
```typescript
PaymentTerminal
PaymentHistoryTable
StripeConfigForm
LocationCard
GroupOverviewDashboard
```

**Verificación:**
- Payment terminal funciona con Stripe real (en test mode)
- Refund procesa correctamente

---

## ENTREGABLE

```
apps/api/src/modules/
├── payments/
│   ├── payments.controller.ts      ✅ (with Stripe)
│   ├── payments.service.ts          ✅ (Stripe integration)
│   ├── stripe.service.ts           ✅
│   ├── stripe-webhook.controller.ts ✅
│   └── payments.service.spec.ts
├── groups/
│   ├── restaurant-groups.controller.ts
│   ├── restaurant-groups.service.ts
│   └── groups.service.spec.ts
└── jobs/

apps/web/
├── pages/
│   ├── payments/
│   │   ├── index.tsx
│   │   └── process.tsx
│   └── admin/
│       ├── stripe.tsx
│       └── multi-location/
│           ├── index.tsx
│           └── new-location.tsx
└── components/
    ├── PaymentTerminal/
    └── LocationCard/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Stripe PaymentIntent creado correctamente
6. Webhook events actualizan order status
7. Split payments crean múltiples PaymentIntents
8. Deposit para reserva funciona
9. Tip processing actualiza payment
10. Refund completa vía Stripe
11. Multi-location: grupo creado
12. Multi-location: analytics agregados
13. Multi-location: guests linked across locations

---

## PREGUNTA DE APROBACIÓN

Payments (Stripe) + Multi-location completo: Stripe PaymentIntents, webhook handling, deposits, split payments, tips, refunds, restaurant groups, cross-location guest profiles, y aggregated analytics.

**¿Avanzamos a la PROMPT-10 — Deployment + Security + Mobile Prep?**