# PROMPT FASE 6 — STAFF OPS + POS

**Por qué es importante:** Los módulos anteriores capturan datos. Este módulo pone las herramientas en las manos de losStaff Ops que las usan todos los días: servers tomando órdenes tableside, hosts asignando mesas, bartenders procesando pagos. Es donde el sistema se vuelve operativo en el piso.

---

## TAREA 1: Tableside Ordering (Handheld App)

```typescript
// apps/mobile/src/screens/TableOrderScreen.tsx

// Server abre la app, selecciona mesa (o escanea QR en la mesa)
// Ve el menú categorizado por sección
// Agrega items al orden con modifiers

interface TableOrderFlow {
  step1: server selects table from floor plan
  step2: browse menu categories (Starters, Mains, Desserts, Wine)
  step3: tap item → modifiers modal
  step4: add to order
  step5: repeat until complete
  step6: review order (editable)
  step7: send to kitchen (FIRE button)
}
```

**Hooks para mobile:**
```typescript
// apps/mobile/hooks/useTableOrder.ts
export function useTableOrder(tableId: string) {
  const [order, setOrder] = useState<OrderItem[]>([]);

  const addItem = (menuItem: MenuItem, modifiers: string[], seatNumber?: number) => {
    setOrder(prev => [...prev, { menuItemId, modifiers, seatNumber, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setOrder(prev => prev.filter((_, i) => i !== index));
  };

  const sendOrder = async () => {
    await apiClient.post('/api/v1/orders', {
      tableId,
      items: order,
      source: 'DINE_IN',
    });
  };

  return { order, addItem, removeItem, sendOrder };
}
```

**UX Requirements:**
- One-handed operation (server holds drink tray with other hand)
- Large touch targets (min 48px)
- Menu searchable by name
- Recent items (most ordered) shown first
- Course selection per item

**Verificación:**
- Server crea orden de 8 items en <60 segundos
- Order aparece en KDS en <1 segundo

---

## TAREA 2: POS Terminal (Desktop/Tablet)

```typescript
// apps/web/src/pages/pos/index.tsx

// Usado en host stand y bar
// Funcionalidades:
// - Menu management
// - Order taking (similar a tableside pero para bar/to-go)
// - Table management
// - Quick actions: 86 item, comp, discount
```

**POS Components:**
```typescript
// MenuGrid — grid de items por categoría
// OrderPanel — orden actual con totales
// QuickActions — botones: 86, comp %, discount $
// PaymentPanel — procesamiento de pago
// TableSelector — dropdown o visual floor
```

**Endpoints:**
```
GET    /api/v1/pos/menu           → menú completo con categorías
GET    /api/v1/pos/menu/:categoryId → items de una categoría
POST   /api/v1/pos/order          → crear orden (similar a tableside)
PATCH  /api/v1/pos/tables/:id/status → cambiar status de mesa
POST   /api/v1/pos/tables/:id/transfer → transferir orden a otra mesa
```

**Verificación:**
- POS muestra menú completo con precios
- 86 item desde POS → aparece en todas partes

---

## TAREA 3: Bill Splitting

```typescript
// orders/bill-splitting.service.ts

// Split por seat, por item, o por porcentaje

interface SplitRequest {
  orderId: string;
  splits: {
    type: 'SEAT' | 'ITEM' | 'PERCENTAGE' | 'EQUAL';
    recipientId?: string; // guestId o seatNumber
    items?: string[];     // orderItemIds si type=ITEM
    percentage?: number;  // si type=PERCENTAGE
  }[];
}

// Ejemplo: split por seat
{
  splits: [
    { type: 'SEAT', recipientId: 'seat1' },
    { type: 'SEAT', recipientId: 'seat2' },
    { type: 'SEAT', recipientId: 'seat3' }
  ]
}
// Resultado: 3 pagos parciales

// Ejemplo: split por porcentaje
{
  splits: [
    { type: 'PERCENTAGE', percentage: 40 },
    { type: 'PERCENTAGE', percentage: 60 }
  ]
}
```

**Endpoint:**
```
POST /api/v1/orders/:id/split   → crear splits
GET  /api/v1/orders/:id/splits → ver splits generados
```

**Verificación:**
- Split por 3 seats → 3 pagos parciales creados
- Split por item → específico de items

---

## TAREA 4: Payment Processing

```typescript
// Model: Payment
model Payment {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])

  amount       Decimal  @db.Decimal(10,2)
  tip          Decimal  @db.Decimal(10,2) @default(0)
  total        Decimal  @db.Decimal(10,2)

  method       PaymentMethod
  status       PaymentStatus @default(PENDING)

  // Stripe refs
  stripePaymentIntentId String?
  stripeChargeId        String?

  // Split tracking
  splitOf   String?    // parent payment id if this is a split payment

  processedAt DateTime?

  createdAt  DateTime @default(now())
}

enum PaymentMethod {
  CARD
  CASH
  DIGITAL_WALLET  // Apple Pay, Google Pay
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```

**Endpoint:**
```
POST /api/v1/payments/process    → procesar pago (simulate Stripe)
GET  /api/v1/payments/methods   → métodos disponibles
POST /api/v1/payments/:id/refund → reembolsar
```

**Payment flow (simulated):**
```typescript
// Para demo/testing: payment funciona sin Stripe real
// En producción: integrar Stripe con el mismo interface

async processPayment(orderId: string, method: PaymentMethod, tip?: Decimal) {
  // 1. Calcular total (subtotal + tax)
  // 2. Si method === CARD → "simulate Stripe" (para Phase 6)
  //    En Phase 7: integrar Stripe real
  // 3. Crear Payment con status COMPLETED
  // 4. Update order status → COMPLETED
  // 5. Si split → crear Payments hijos
  // 6. Disparar receipt email
}
```

**Verificación:**
- Pago procesado → order completada, payment registrado
- Split payment → múltiples payments generados

---

## TAREA 5: Tip Management

```typescript
// Model: TipDistribution
model TipDistribution {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  orderId     String

  totalTips   Decimal  @db.Decimal(10,2)
  tipOut      Decimal  @db.Decimal(10,2)  // cantidad repartida a support staff

  distribution TipShare[]
  createdAt    DateTime @default(now())
}

model TipShare {
  id         String   @id @default(uuid())
  distributionId String
  distribution TipDistribution @relation(fields: [distributionId], references: [id])

  userId     String
  user       User     @relation(fields: [userId], references: [id])

  percentage Decimal  @db.Decimal(5,2) @default(0)
  amount     Decimal  @db.Decimal(10,2)
  role       Role     // SERVER, BARTENDER, HOST, etc.
}
```

**Endpoint:**
```
GET  /api/v1/staff/tips/:orderId     → ver distribución
POST /api/v1/staff/tips/distribute  → distribuir tips de una order
GET  /api/v1/staff/tips/period      → tips por período (semanal, mensual)
```

**Reglas de distribución (configurables por tenant):**
- Servers: 70% of tip pool
- Bartenders: 15%
- Host: 10%
- Busser: 5%

**Verificación:**
- Order con $200 total, tip $40 → distribución según reglas
- Reporte de tips por período funciona

---

## TAREA 6: Staff Scheduling & Time Clock

```typescript
// Model: Shift
model Shift {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  date      DateTime @db.Date
  startTime String   // "09:00"
  endTime   String   // "17:00"

  role      Role
  status    ShiftStatus @default(SCHEDULED)
  // SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW

  clockedInAt DateTime?
  clockedOutAt DateTime?

  laborCost  Decimal?  @db.Decimal(10,2)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId, date])
}

model TimeClockEntry {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  shiftId   String?
  shift     Shift?   @relation(fields: [shiftId], references: [id])

  clockIn   DateTime
  clockOut  DateTime?

  notes     String?

  @@index([tenantId, clockIn])
}
```

**Endpoints:**
```
POST /api/v1/staff/clock-in      → clock in (userId, shiftId optional)
POST /api/v1/staff/clock-out     → clock out
GET  /api/v1/staff/shifts        → lista de turnos (por fecha)
POST /api/v1/staff/shifts        → crear shift
PATCH /api/v1/staff/shifts/:id   → editar shift
GET  /api/v1/staff/labor-cost    → labor cost por período
```

**Labor cost calculation:**
```typescript
// Por shift:
// hours = clockOut - clockIn
// rate = user.hourlyRate (stored in User or Shift)
// laborCost = hours * rate

// Reporte: labor cost como % de revenue
// Meta: < 30% of revenue
```

**Verificación:**
- Clock in → TimeClockEntry creado con timestamp
- Labor cost calculado correctamente
- Reporte: labor % coincide con expectations

---

## TAREA 7: Staff Performance Metrics

```typescript
// Endpoints
GET /api/v1/staff/:userId/performance?period=30d

interface StaffPerformance {
  userId: string;
  period: { start: Date; end: Date };

  // Sales metrics
  totalSales: number;
  totalCovers: number;
  avgSpendPerCover: number;
  ordersCount: number;

  // Attachment rates
  appetizerAttachmentRate: number; // % of orders with appetizer
  dessertAttachmentRate: number;
  wineAttachmentRate: number;

  // Tip metrics
  avgTipPercent: number;
  totalTips: number;

  // Operational
  punctualityRate: number; // % of shifts on time
  avgShiftDuration: number;
}
```

**Calculo:**
```typescript
// attachment rate = orders_with_item / total_orders
// tip % = tip_amount / subtotal * 100
// punctuality = shifts_clock_in_on_time / total_shifts
```

**Verificación:**
- Server stats muestran todas las métricas
- Comparación entre servers funciona

---

## TAREA 8: User Management (RBAC)

**Modelo existente (en schema) extiende:**
```prisma
model User {
  // ...existing fields...
  hourlyRate   Decimal?  @db.Decimal(10,2)
  isActive     Boolean   @default(true)
}
```

**Endpoints:**
```
GET    /api/v1/users              → lista (filtro por role)
GET    /api/v1/users/:id          → detalle
POST   /api/v1/users              → crear (solo OWNER/MANAGER)
PATCH  /api/v1/users/:id          → actualizar
PATCH  /api/v1/users/:id/role     → cambiar role
PATCH  /api/v1/users/:id/deactivate → desactivar (soft delete)
```

**Permissions:**
```typescript
const PERMISSIONS = {
  OWNER: ['*'],  // todo
  MANAGER: ['read', 'write', 'orders', 'inventory', 'staff', 'reports'],
  HEAD_CHEF: ['read', 'write', 'menu', 'inventory'],
  SERVER: ['orders:read', 'orders:write', 'tables:read'],
  HOST: ['reservations:read', 'reservations:write', 'tables:write'],
  BARTENDER: ['orders:read', 'orders:write', 'tables:read'],
};
```

**Verificación:**
- USER no puede crear otros users
- MANAGER puede crear SERVER pero no OWNER
- OWNER puede asignar cualquier role

---

## TAREA 9: Training Mode

```typescript
// Training mode: sandbox sin afectar datos reales

// Middleware que detecta modo training
// En training mode:
// - Orders no decrementan inventory
// - Payments no son procesados (simulated)
// - Reservations no restan disponibilidad real
// - Stats no afectan reportes reales

// Flag en tenant o en user session
model Tenant {
  // ...existing...
  trainingMode Boolean @default(false)
}
```

**Endpoint:**
```
PATCH /api/v1/system/training-mode  → toggle (OWNER only)
```

**UI:**
- Cuando training mode ON → todo el UI con borde naranja "TRAINING"
- Banner "TRAINING MODE — No real data affected"

**Verificación:**
- Training mode ON → orders no cambian inventory
- Training mode OFF → comportamiento normal

---

## TAREA 10: Tests

```typescript
describe('StaffOpsService', () => {
  it('should create order from tableside app');
  it('should split bill by seats correctly');
  it('should process payment and complete order');
  it('should calculate tip distribution correctly');
  it('should clock in and out');
  it('should calculate labor cost per shift');
  it('should return staff performance metrics');
  it('should enforce role-based permissions');
  it('should NOT process real payments in training mode');
  it('should show training mode UI flag');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 11: Staff Ops UI

```
/pos                      → POS terminal (desktop)
/pos/tableside            → Tableside (tablet/mobile)
Mobile app: TableOrderScreen
/staff/schedule           → scheduling
/staff/performance        → performance reports
/staff/shifts             → shift list
/admin/users              → user management
/admin/training-mode      → toggle training
```

**Verificación:**
- POS funciona en tablet
- Tableside order → KDS en <1s

---

## ENTREGABLE

```
apps/api/src/modules/
├── orders/
│   ├── orders.service.ts        ✅ (includes splitting)
│   └── orders.controller.ts
├── payments/
│   ├── payments.controller.ts   ✅
│   ├── payments.service.ts      ✅
│   └── payments.service.spec.ts
├── staff/
│   ├── staff.controller.ts     ✅
│   ├── staff.service.ts         ✅
│   ├── scheduling.service.ts    ✅
│   ├── time-clock.service.ts    ✅
│   ├── tip-distribution.service.ts ✅
│   └── staff.service.spec.ts
├── users/
│   └── users.controller.ts      ✅ (RBAC)
└── jobs/

apps/web/
├── pages/
│   ├── pos/index.tsx           ✅
│   └── staff/
│       ├── schedule.tsx
│       ├── performance.tsx
│       └── shifts.tsx
├── components/
│   ├── MenuGrid/
│   ├── OrderPanel/
│   └── PaymentPanel/

apps/mobile/
├── src/screens/
│   ├── TableOrderScreen.tsx    ✅
│   └── TableSelectionScreen.tsx
└── hooks/
    └── useTableOrder.ts
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Tableside ordering → orden enviada a KDS en <1s
6. Bill splitting genera splits correctos
7. Payment processing crea Payment records
8. Tip distribution según reglas configuradas
9. Time clock crea entries precisas
10. Training mode no afecta datos reales

---

## PREGUNTA DE APROBACIÓN

Staff Ops + POS completo: tableside ordering, POS terminal, bill splitting, payment processing, tip management, time clock, scheduling, staff performance, user management, y training mode.

**¿Avanzamos a la PROMPT-7 — Analytics + Dashboard?**