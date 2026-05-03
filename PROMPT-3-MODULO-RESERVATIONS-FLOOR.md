# PROMPT FASE 3 — MÓDULO RESERVATIONS & FLOOR MANAGEMENT

**Por qué es importante:** La reservation es el punto de entrada del invitado al sistema. Aquí se captura la primera impresión, se asigna la mesa, se previenen no-shows, y se integra con el CRM. Sin reservations, no hay guest profile, no hay orders, no hay revenue.

---

## TAREA 1: Modelos Prisma para Reservations

```prisma
model Reservation {
  id            String   @id @default(uuid())
  tenantId       String
  tenant         Tenant   @relation(fields: [tenantId], references: [id])

  // Guest link
  guestId       String?
  guest         Guest?   @relation(fields: [guestId], references: [id])

  // Booking details
  date          DateTime @db.Date
  time          String   // "19:30"
  partySize     Int
  status        ReservationStatus @default(CONFIRMED)
  bookingType   BookingType @default(STANDARD)

  // Contact info (captured even if no guest profile)
  guestFirstName String
  guestLastName  String?
  guestEmail    String?
  guestPhone    String?

  // Table assignment
  tableId       String?
  table         Table?   @relation(fields: [tableId], references: [id])
  tablePref     String?  // "window", "booth", "private"

  // Deposit / Payment
  depositRequired Boolean @default(false)
  depositAmount   Decimal? @db.Decimal(10,2)
  depositPaid     Boolean  @default(false)
  depositPaidAt   DateTime?

  // No-show tracking
  noShowCount    Int      @default(0)
  notes          String?

  // Special occasions
  occasion       String?  // "birthday", "anniversary", "business"
  occasionNote   String?  // "He proposed here 5 years ago"

  // Notifications
  reminderSent   Boolean  @default(false)
  confirmationSent Boolean @default(false)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([tenantId, date])
  @@index([tenantId, status])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  SEATED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum BookingType {
  STANDARD
  DEPOSIT_REQUIRED
  PREPAID_EXPERIENCE  // Chef's table, wine dinner
  WALK_IN
}
```

**Verificación:** `npx prisma validate`, migration creada

---

## TAREA 2: Modelo Prisma para Tables (Floor)

```prisma
model Table {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  number      Int      // 1, 2, 3...
  name        String?  // "Table 1" or "Window Booth 3"
  capacity    Int      // max covers
  minCapacity Int      @default(1)
  section     String?  // "patio", "main", "private"

  // Position for floor plan editor
  positionX   Int?
  positionY   Int?

  // Status (real-time, guardado en Redis también para velocidad)
  status      TableStatus @default(AVAILABLE)

  // Current reservation (si está reservada)
  currentReservationId String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  reservations Reservation[]
  orders       Order[]

  @@unique([tenantId, number])
}

enum TableStatus {
  AVAILABLE
  RESERVED
  SEATED
  ORDERED
  DESSERT
  BILL
  TURNING  // being cleaned
}
```

**Verificación:** schema válido, indices creados

---

## TAREA 3: Endpoints de Reservations

**Rutas:**
```
GET    /api/v1/reservations              → lista por fecha (default: hoy)
GET    /api/v1/reservations/:id           → detalle
POST   /api/v1/reservations               → crear
PATCH  /api/v1/reservations/:id           → actualizar (cambiar hora, mesa, status)
DELETE /api/v1/reservations/:id           → cancelar
PATCH  /api/v1/reservations/:id/status    → cambiar status (confirm, seat, complete, no-show)

GET    /api/v1/reservations/by-date/:date  → todas las reservas de una fecha
GET    /api/v1/reservations/by-guest/:guestId → historial del guest

POST   /api/v1/reservations/:id/send-reminder → enviar recordatorio SMS/email
POST   /api/v1/reservations/:id/confirm      → marcar como pagada deposit
```

**DTOs:**
```typescript
export class CreateReservationDto {
  @IsString() guestFirstName!: string;
  @IsOptional() @IsString() guestLastName?: string;
  @IsOptional() @IsEmail() guestEmail?: string;
  @IsOptional() @IsString() guestPhone?: string;

  @IsDateString() date!: string;
  @IsString() time!: string;
  @IsInt() @Min(1) partySize!: number;

  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @IsString() tablePref?: string;
  @IsOptional() @IsString() occasion?: string;
  @IsOptional() @IsString() occasionNote?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(BookingType) bookingType?: BookingType;
  @IsOptional() @IsBoolean() depositRequired?: boolean;
}

export class UpdateReservationDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() time?: string;
  @IsOptional() @IsInt() @Min(1) partySize?: number;
  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @IsOptional() @IsString() notes?: string;
}

export class ChangeStatusDto {
  @IsEnum(ReservationStatus) status!: ReservationStatus;
  @IsOptional() @IsString() reason?: string;
}
```

**Verificación:**
- Crear reserva → 201, tabla asignada o waitlist
- Cambiar status → actualizado en DB + WebSocket broadcast
- No-show → increment noShowCount en guest

---

## TAREA 4: Floor Plan Endpoints

**Rutas:**
```
GET    /api/v1/floor/tables              → todas las mesas con status
GET    /api/v1/floor/tables/:id          → detalle de mesa
PATCH  /api/v1/floor/tables/:id          → actualizar mesa (position, capacity)
PATCH  /api/v1/floor/tables/:id/status   → cambiar status en tiempo real

GET    /api/v1/floor/sections            → secciones configuradas
GET    /api/v1/floor/coverage            → ocupación del momento

GET    /api/v1/floor/stats               → stats: covers ahora, waitlist length, turn time avg
```

**Integración con Redis para estado en tiempo real:**
```typescript
// FloorService — status de mesa actualizado en Redis para speed
async updateTableStatus(tableId: string, status: TableStatus) {
  await this.redis.set(`table:${tableId}:status`, status);
  // Publish event for WebSocket clients
  await this.eventBus.publish('table.status.changed', { tableId, status, tenantId });
}
```

**Verificación:**
- Cambiar status de mesa → Redis actualizado + WebSocket broadcast en <100ms
- Stats de floor accurate

---

## TAREA 5: Table Optimization Engine

**Lógica de asignación automática:**
```typescript
// tables/table-optimization.service.ts
async suggestTable(reservation: CreateReservationDto): Promise<string | null> {
  // 1. Filtrar mesas con capacidad suficiente
  // 2. Filtrar mesas de la preferencia del guest si especificó
  // 3. Filtrar mesas disponibles en el horario
  // 4. Priorizar mesas que están "TURNING" (más rápido de limpiar vs AVAILABLE hace más tiempo)
  // 5. Return tableId o null (waitlist)
}
```

**Waitlist logic:**
```typescript
async addToWaitlist(partySize: number, tenantId: string): Promise<WaitlistEntry> {
  // Agregar a lista de espera
  // Cuando mesa se libera, notificar al primero de la waitlist
}
```

**Verificación:**
- Reserva para 4 → sugiere mesa con capacidad 4+ que esté turning
- No hay mesas → agrega a waitlist y devuelve posición

---

## TAREA 6: No-Show Prevention

**Reminder jobs (BullMQ):**
```typescript
// jobs/reservation-reminders.job.ts
// 24h antes → SMS reminder
// 2h antes → SMS confirmation request
// Si no confirma → marcar como "unconfirmed" (no deposit taken)

@Processor('reservation-reminders')
export class ReservationRemindersProcessor {
  @Process('send-24h-reminder')
  async sendReminder(job: Job) {
    const { reservationId } = job.data;
    // Buscar phone, enviar SMS
    // Marcar reminderSent = true
  }

  @Process('send-2h-confirmation')
  async sendConfirmation(job: Job) {
    // SMS con link para confirmar
  }
}
```

**No-show tracking:**
```typescript
async markNoShow(reservationId: string) {
  const reservation = await this.prisma.reservation.update({
    where: { id: reservationId },
    data: { status: NO_SHOW }
  });

  if (reservation.guestId) {
    await this.prisma.guest.update({
      where: { id: reservation.guestId },
      data: { noShowCount: { increment: 1 } }
    });
  }
}
```

**Verificación:**
- Job ejecuta 24h antes y envía reminder
- No-show incrementa contador en guest profile

---

## TAREA 7: White-Label Booking Widget (API)

**Este endpoint sería consumido por el frontend del restaurante:**
```
POST /api/v1/public/reservations  ( público — no requiere auth del tenant )
```

**Request:**
```json
{
  "restaurantSlug": "myrestaurant",
  "date": "2025-05-15",
  "time": "19:30",
  "partySize": 4,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1 555-1234",
  "occasion": "anniversary"
}
```

**Validaciones:**
- Validate restaurantSlug existe y está activo
- Validate date/time no es en el pasado
- Validate hay disponibilidad

**Verificación:**
- POST a endpoint público → crea reservation con tenantId del restaurante
- Slot no disponible → 409 Conflict

---

## TAREA 8: Floor Plan Editor (Web)

**Drag-and-drop:**
```
/floor  → Floor plan en vivo
/floor/edit → Editor de layout (arrastrar mesas)
```

**Componentes UI:**
```typescript
// TableTile component
interface TableTileProps {
  table: Table;
  onStatusChange: (status: TableStatus) => void;
  onAssign: (reservationId: string) => void;
}

// Muestra: guest name, occasion, allergy alerts, VIP badge, time seated
// Colors: AVAILABLE=green, RESERVED=blue, SEATED=yellow, ORDERED=orange, BILL=red
```

**Verificación:**
- Mover mesa en editor → guarda positionX/positionY
- Status cambia en tiempo real (WebSocket)

---

## TAREA 9: Tests

```typescript
describe('ReservationsService', () => {
  it('should create reservation and link guest');
  it('should update table status on seat');
  it('should increment no-show count');
  it('should suggest optimal table');
  it('should add to waitlist when no tables');
  it('should NOT allow past date reservations');
  it('should send reminder job');
  it('should public booking create for correct tenant');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 10: Componentes UI para Floor

**En `/packages/ui`:**
```typescript
// TableTile
// FloorPlan
// ReservationCard
// WaitlistWidget
// TableStatusBadge
// OccupancySummary
```

**Verificación:**
- TableTile muestra guest info + VIP badge + allergy alert
- FloorPlan actualizado en tiempo real

---

## ENTREGABLE

```
apps/api/src/modules/
├── reservations/
│   ├── reservations.controller.ts  ✅
│   ├── reservations.service.ts     ✅
│   ├── dto/                        ✅
│   └── reservations.service.spec.ts
├── floor/
│   ├── floor.controller.ts        ✅
│   ├── floor.service.ts            ✅
│   └── table-optimization.service.ts
└── jobs/
    └── reservation-reminders.processor.ts ✅

apps/web/
├── hooks/useReservations.ts
├── hooks/useFloor.ts
├── pages/floor/
│   ├── index.tsx                  ✅ floor en vivo
│   └── edit.tsx                   ✅ editor layout
└── components/floor/              ✅ componentes

packages/ui/src/components/
├── TableTile/
├── FloorPlan/
├── ReservationCard/
└── WaitlistWidget/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Swagger: todos los endpoints de reservations + floor
6. Public booking endpoint acepta requests sin auth
7. Table status cambia en <100ms via WebSocket
8. No-show tracking linked to guest profile
9. Aislamiento de tenant verificado

---

## PREGUNTA DE APROBACIÓN

Reservations & Floor Management completo: booking engine white-label, floor plan en vivo, table optimization, no-show prevention con SMS reminders, y waitlist management.

**¿Avanzamos a la PROMPT-4 — Kitchen Command System (KDS)?**