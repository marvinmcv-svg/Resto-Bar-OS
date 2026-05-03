# PROMPT FASE 8 — MARKETING AUTOMATION + NOTIFICATIONS

**Por qué es importante:** Un restaurante fine dining necesita mantener relación con sus invitados entre visitas. Este módulo automatiza comunicación personalizada: confirmación de reserva, post-dining feedback, cumpleaños, win-back de inactivos. Todo basado en comportamiento real, no intuición.

---

## TAREA 1: Notification Models

```prisma
model EmailCampaign {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  name         String
  type         CampaignType
  trigger      CampaignTrigger

  // Targeting
  targetSegment: String[] // ["VIP", "lapsed_90", "birthday_this_month"]
  minSpend     Decimal? @db.Decimal(10,2)
  minVisits    Int?

  // Content
  subject      String
  templateId   String   // reference to email template
  contentJson  Json     // { title, body, cta_text, cta_url, images }

  // Scheduling
  sendAt       DateTime? // si es scheduled, si no es trigger-based
  createdAt    DateTime @default(now())

  // Stats (actualizados post-send)
  sentCount    Int      @default(0)
  openCount    Int      @default(0)
  clickCount   Int      @default(0)
  conversionCount Int   @default(0) // reservas generadas

  status       CampaignStatus @default(DRAFT)

  @@index([tenantId, status])
}

enum CampaignType {
  EMAIL
  SMS
  PUSH
}

enum CampaignTrigger {
  IMMEDIATE        // enviado inmediatamente post-action
  SCHEDULED        // día/hora específico
  RESERVATION_MADE // trigger: nueva reserva
  POST_DINING      // trigger: orden completada
  BIRTHDAY         // trigger: día específico
  WINBACK_60       // trigger: 60 días sin visita
  WINBACK_90       // trigger: 90 días sin visita
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  PAUSED
  FAILED
}

model CampaignAnalytics {
  id           String   @id @default(uuid())
  campaignId   String
  campaign     EmailCampaign @relation(fields: [campaignId], references: [id])

  guestId      String
  guest        Guest    @relation(fields: [guestId], references: [id])

  sentAt       DateTime
  openedAt     DateTime?
  clickedAt    DateTime?
  convertedAt  DateTime?  // si hizo reserva

  error        String?
}
```

**Verificación:** schema válido, migration creada

---

## TAREA 2: Email Templates (Pre-built)

**Templates necesarios:**

```typescript
// templates/pre-dining.ts
export const PRE_DINING_TEMPLATE = {
  name: 'Pre-Dining Confirmation',
  subject: 'Your reservation at {{restaurantName}}',
  sections: {
    header: '{{restaurantLogo}}',
    greeting: 'Dear {{guestName}},',
    body: `
      We're looking forward to welcoming you{{#if occasion}} for your {{occasion}}{{/if}}.

      Your reservation details:
      📅 {{date}} at {{time}}
      👥 {{partySize}} guests
      📍 {{restaurantAddress}}

      {{#if depositRequired}}
      A deposit of {{depositAmount}} was taken. See you soon!
      {{/if}}
    `,
    cta: {
      text: 'Modify Reservation',
      url: '{{reservationModifyUrl}}'
    },
    footer: 'Questions? Call us at {{restaurantPhone}}'
  }
};

// templates/post-dining.ts
export const POST_DINING_TEMPLATE = {
  name: 'Post-Dining Thank You',
  subject: 'Thank you for dining with us',
  body: `
    Dear {{guestName}},

    Thank you for joining us{{#if visitDate}} on {{visitDate}}{{/if}}.

    {{#if orderTotal}}
    We hope you enjoyed your meal. Your total was {{orderTotal}}.
    {{/if}}

    Your feedback matters to us:
    {{feedbackLinks.good}}
    {{feedbackLinks.neutral}}
    {{feedbackLinks.poor}}

    We hope to welcome you back soon.
    The {{restaurantName}} Team
  `
};

// templates/birthday.ts
export const BIRTHDAY_TEMPLATE = {
  name: 'Birthday Wishes',
  subject: '🎂 A special day deserves a special celebration',
  body: `
    Dear {{guestName}},

    Happy {{birthdayType}}! We hope you'll let us be part of your celebration.

    As our gift: {{birthdayOffer}} (valid {{validDates}})

    Book your table: {{bookingUrl}}

    See you soon!
  `
};

// templates/winback.ts
export const WINBACK_90_TEMPLATE = {
  name: 'We miss you',
  subject: "It's been a while, {{guestName}}",
  body: `
    Dear {{guestName}},

    It's been {{daysSinceVisit}} days since your last visit to {{restaurantName}}.

    We miss you! Here's an incentive to come back:
    {{winbackOffer}}

    Valid until {{offerExpiry}}. We'd love to see you again.

    Book: {{bookingUrl}}
  `
};
```

**Verificación:** templates con handlebars syntax correct

---

## TAREA 3: Campaign Builder Service

```typescript
// marketing/campaign-builder.service.ts

interface CreateCampaignDto {
  name: string;
  type: CampaignType;
  trigger: CampaignTrigger;
  targetSegment: string[];
  subject: string;
  content: any;
  sendAt?: Date;
}

async function buildCampaign(dto: CreateCampaignDto, tenantId: string) {
  // 1. Validar que el tenant tiene los datos necesarios
  // 2. Calcular audience size
  // 3. Crear campaign record
  // 4. Si trigger-based → guardar para ejecutarse cuando ocurra
  // 5. Si scheduled → programar job en BullMQ
}

async function getAudienceCount(tenantId: string, segment: string[]): Promise<number> {
  // Segment mapping
  const segmentQueries = {
    'VIP': { vipTier: { in: ['GOLD', 'PLATINUM'] } },
    'HIGH_SPENDER': { averageSpend: { gte: 300 } },
    'LAPSED_90': { lastVisit: { lt: 90 days ago } },
    'LAPSED_60': { lastVisit: { lt: 60 days ago } },
    'BIRTHDAY_THIS_MONTH': { /* mes actual */ },
    'REGULAR': { visitCount: { gte: 3 } },
    'FIRST_VISIT': { visitCount: { equals: 1 } },
  };

  // Build Prisma query con OR para múltiples segments
}
```

**Endpoints:**
```
POST /api/v1/marketing/campaigns          → crear campaña
GET  /api/v1/marketing/campaigns       → lista
GET  /api/v1/marketing/campaigns/:id    → detalle
PATCH /api/v1/marketing/campaigns/:id   → editar (solo si DRAFT)
POST /api/v1/marketing/campaigns/:id/send → ejecutar ahora
DELETE /api/v1/marketing/campaigns/:id  → cancelar

GET  /api/v1/marketing/campaigns/:id/analytics → stats de la campaña
GET  /api/v1/marketing/audience-preview → preview audience size por segment
```

**Verificación:**
- Crear campaign → guardada en DB
- Audience preview → número de guests en el segmento
- Scheduled → job creado en BullMQ

---

## TAREA 4: Automated Trigger Engine

```typescript
// marketing/trigger-engine.service.ts

// Se ejecuta cuando ocurre un evento específico
//注册 event handlers para triggers

// POST_DINING trigger
async function onOrderCompleted(orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { guest: true, table: { include: { tenant: true } } }
  });

  // 1. Enviar post-dining thank you email
  await this.queue.add('send-post-dining', {
    guestId: order.guestId,
    tenantId: order.table.tenantId,
    orderId: order.id,
  });

  // 2. Actualizar guest profile (visit count, last visit)
  // 3. Recalcular tags (¿sigue siendo VIP? ¿lapsed?)

  // 4. Si guest tiene birthday cercano → queue birthday offer
  if (this.isBirthdaySoon(order.guest)) {
    await this.queue.add('schedule-birthday-campaign', { guestId: order.guestId });
  }
}

// BIRTHDAY trigger (se ejecuta job diario)
@Process('check-birthdays')
async function checkBirthdays(job: Job) {
  // Buscar guests con cumpleaños hoy
  // Enviar birthday campaign
}

// WINBACK trigger (se ejecuta job semanal)
@Process('check-winback')
async function checkWinback(job: Job) {
  // 60 days: enviar winback 60 campaign
  // 90 days: enviar winback 90 campaign
}
```

**Verificación:**
- Order completada → email post-dining enviado en <5 min
- Guest con cumpleaños → campaña trigger targeting birthday

---

## TAREA 5: Email Service Integration

```typescript
// Sends emails via SendGrid or Postmark
// Interface abstraction para poder cambiar provider

// Para Phase 8 (demo): email logging to DB
// Para Phase 9: integrate real SendGrid

interface EmailPayload {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  // Phase 8: solo guardar en DB como "sent" log
  // console.log que se enviaría
  // Phase 9: integrate real provider

  await this.prisma.emailLog.create({
    data: {
      tenantId: payload.tenantId,
      guestId: payload.guestId,
      campaignId: payload.campaignId,
      to: payload.to,
      subject: payload.subject,
      sentAt: new Date(),
      status: 'QUEUED' // hasta que se realmente envie
    }
  });
}

// SMS (simulado para Phase 8)
async function sendSms(phone: string, message: string): Promise<void> {
  // Log to DB, console.log en Phase 8
  // Phase 9: integrate Twilio
}
```

**Verificación:**
- Email log creado en DB
- Subject y content correctos

---

## TARE 6: SMS Reminders (Already in Phase 3 for reservations)

**Re-aprovechar el sistema de reminders ya diseñado:**
```typescript
// Ya implementado en PROMPT-3:
// - 24h reminder SMS
// - 2h confirmation request
// Ahora: integrarlo en campaign system

// Templates SMS:
const SMS_REMINDER = "Hi {{guestName}}, reminding you of your reservation at {{restaurantName}} tomorrow at {{time}}. Reply CONFIRM to confirm or call {{restaurantPhone}} to modify.";

const SMS_BIRTHDAY = "Happy {{birthdayType}}, {{guestName}}! 🎂 Enjoy a complimentary dessert on your next visit. Book with code BIRTHDAY{{birthdayYear}}. Valid 30 days.";
```

---

## TAREA 7: Notification Center (Dashboard)

```typescript
// Todas las notificaciones del sistema en un inbox

model Notification {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  type      NotificationType
  title     String
  message   String
  data      Json?    // { guestId, reservationId, ingredientId, etc. }

  read      Boolean  @default(false)
  readAt    DateTime?

  createdAt DateTime @default(now())

  @@index([tenantId, read, createdAt])
}

enum NotificationType {
  LOW_STOCK          // from inventory
  RESERVATION_NEW    // new booking
  RESERVATION_REMINDER // 24h/2h reminder sent
  NO_SHOW            // guest didn't show
  CAMPAIGN_SENT      // email campaign completed
  CAMPAIGN_OPENED    // guest opened email
  REVIEW_NEGATIVE    // bad review detected
  GUEST_BIRTHDAY     // birthday trigger
  WINBACK_SENT       // winback campaign sent
}
```

**Endpoints:**
```
GET /api/v1/notifications          → lista (paginated, filterable)
GET /api/v1/notifications/unread   → count de no leídas
PATCH /api/v1/notifications/:id/read → marcar como leída
PATCH /api/v1/notifications/read-all → marcar todas como leídas
DELETE /api/v1/notifications/:id   → borrar
```

**Verificación:**
- Notification creada → aparece en dashboard
- Marcar como leída → update en DB

---

## TAREA 8: Reputation Management (Reviews)

```typescript
// Aggregates reviews from Google, Yelp, Facebook
// Phase 8: solo modelo e interface
// Phase 9: integrate real APIs

model Review {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  source       ReviewSource  // GOOGLE, YELP, FACEBOOK
  externalId   String   // ID del review en la plataforma
  authorName   String
  rating       Int      // 1-5
  content      String
  sentiment    String?  // "positive", "neutral", "negative" (AI scored)
  aiSummary    String?  // AI-generated summary

  respondedAt  DateTime?
  response     String?

  publishedAt  DateTime

  @@unique([tenantId, externalId])
  @@index([tenantId, source])
}

enum ReviewSource {
  GOOGLE
  YELP
  FACEBOOK
  DIRECT  // from feedback form
}
```

**Endpoints:**
```
GET /api/v1/reputation/reviews        → lista de reviews
GET /api/v1/reputation/reviews/aggregate → sentiment summary
POST /api/v1/reputation/reviews/:id/respond → manager responde
GET /api/v1/reputation/reviews/negative → solo negatives (alerts)
```

**Verificación:**
- Reviews list muestra todas las fuentes
- Sentiment analytics muestra distribución

---

## TAREA 9: BullMQ Queue Setup

```typescript
// jobs/queues.ts

export const queues = {
  'emails': new Queue('emails', { connection: redis }),
  'sms': new Queue('sms', { connection: redis }),
  'notifications': new Queue('notifications', { connection: redis }),
  'campaigns': new Queue('campaigns', { connection: redis }),
};

// Named jobs processors
// email.processor.ts
// sms.processor.ts
// notification.processor.ts
// campaign.processor.ts
```

**Jobs:**
```typescript
// email.processor.ts
@Processor('emails')
export class EmailProcessor {
  @Process('send')
  async handleSendEmail(job: Job<{ to, subject, template, variables }>) {
    // Send email
    // Update email log status to SENT or FAILED
    // Track analytics
  }

  @Process('batch')
  async handleBatchSend(job: Job<{ campaignId, guestIds }>) {
    // Send campaign a batches de 100 para no overload
  }
}
```

**Verificación:**
- Jobs criados y ejecutados
- Failed jobs retry 3x
- Dead letter queue para jobs fallidos

---

## TAREA 10: Tests

```typescript
describe('MarketingService', () => {
  it('should create campaign with correct target segment');
  it('should calculate audience size per segment');
  it('should trigger post-dining email on order complete');
  it('should trigger birthday email for guests with birthday');
  it('should trigger winback email at correct interval');
  it('should update campaign analytics on email open');
  it('should NOT send to guests who opted out');
  it('should retry failed emails');
  it('should aggregate reviews from multiple sources');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 11: Marketing UI

```
/marketing               → campaigns dashboard
/marketing/campaigns/new → campaign builder
/marketing/campaigns/[id] → campaign detail + analytics
/marketing/templates      → email templates
/notifications            → notification center
/reputation               → reviews aggregate
/reputation/reviews       → all reviews list
```

**Components:**
```typescript
CampaignBuilderForm
CampaignStats (open rate, click rate, conversion)
AudiencePreview
EmailTemplateEditor
NotificationInbox
ReviewCard (with sentiment badge)
```

**Verificación:**
- Campaign builder permite crear campaign visual
- Stats muestran open rate, click rate post-send

---

## ENTREGABLE

```
apps/api/src/modules/
├── marketing/
│   ├── marketing.controller.ts  ✅
│   ├── marketing.service.ts     ✅
│   ├── campaign-builder.service.ts
│   ├── trigger-engine.service.ts
│   ├── dto/
│   └── marketing.service.spec.ts
├── notifications/
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notification.processor.ts
├── reputation/
│   ├── reputation.controller.ts
│   └── reputation.service.ts
└── jobs/
    ├── email.processor.ts
    ├── sms.processor.ts
    ├── campaign.processor.ts
    └── queues.ts

apps/web/
├── pages/
│   ├── marketing/
│   │   ├── index.tsx
│   │   ├── campaigns/
│   │   └── templates.tsx
│   ├── notifications/index.tsx
│   └── reputation/
│       ├── index.tsx
│       └── reviews.tsx
└── components/
    ├── CampaignBuilderForm/
    ├── NotificationInbox/
    └── ReviewCard/

packages/ui/src/components/
├── EmailTemplate/
├── NotificationBadge/
└── ReviewCard/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Campaign created → saved in DB
6. Post-dining email triggered on order completion
7. Birthday campaign triggered for guests with birthday this month
8. Winback campaign triggered at 60 and 90 days
9. Notification appears in notification center
10. Review aggregation shows sentiment scores

---

## PREGUNTA DE APROBACIÓN

Marketing Automation + Notifications completo: campaign builder, trigger engine con eventos de negocio, email/SMS delivery (simulado), notification center, y reputation management.

**¿Avanzamos a la PROMPT-9 — Payments (Stripe) + Multi-location?**