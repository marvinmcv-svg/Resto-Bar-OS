# PROMPT FASE 4 — KITCHEN COMMAND SYSTEM (KDS)

**Por qué es importante:** Este es el módulo más crítico operativamente. El KDS es lo que conecta la orden del servidor con la cocina en tiempo real. Sin KDS, no hay tickets, no hay control de tiempo, no hay coordinación de estaciones. Es donde cada segundo cuenta.

---

## TAREA 1: Modelos Prisma para Kitchen

```prisma
model MenuItem {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  name         String
  description  String?
  price        Decimal  @db.Decimal(10,2)
  category     String   // "starters", "mains", "desserts", "wine"

  // Kitchen routing
  station      Station  // GRILL, COLD, PASTRY, EXPO
  is86         Boolean  @default(false)  // unavailable

  // Recipe link
  recipeId     String?
  recipe       Recipe?  @relation(fields: [recipeId], references: [id])

  // Modifiers
  availableModifiers String[]  // ["temperature", "sauce"]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orderItems   OrderItem[]

  @@index([tenantId, category])
  @@index([tenantId, station])
}

enum Station {
  GRILL
  COLD
  PASTRY
  EXPO
  BAR
}

model Recipe {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  name         String
  ingredients  RecipeIngredient[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model RecipeIngredient {
  id           String   @id @default(uuid())
  recipeId     String
  recipe       Recipe   @relation(fields: [recipeId], references: [id])

  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])

  quantity     Decimal  @db.Decimal(10,4)
  unit         String   // "g", "ml", "each"
}

model Order {
  id            String   @id @default(uuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])

  // Relations
  tableId       String
  table         Table    @relation(fields: [tableId], references: [id])
  serverId      String
  server        User     @relation(fields: [serverId], references: [id])
  guestId       String?
  guest         Guest?   @relation(fields: [guestId], references: [id])

  // Order details
  items         OrderItem[]
  status        OrderStatus @default(PENDING)

  // Timing
  orderedAt     DateTime @default(now())
  firedAt       DateTime?
  completedAt   DateTime?

  // Source
  source        OrderSource @default(DINE_IN)

  // Special
  occasion      String?
  guestNotes    String?

  // Totals
  subtotal      Decimal  @db.Decimal(10,2)
  tax           Decimal  @db.Decimal(10,2)
  total         Decimal  @db.Decimal(10,2)
  tip           Decimal  @db.Decimal(10,2) @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([tenantId, tableId])
  @@index([tenantId, status])
  @@index([tenantId, orderedAt])
}

enum OrderStatus {
  PENDING    // en cola
  FIRED      // enviado a cocina
  IN_PROGRESS // siendo preparado
  READY      // listo para servir
  SERVED     // en mesa
  COMPLETED  // pagado
  CANCELLED
}

enum OrderSource {
  DINE_IN
  EVENT
  ONLINE
  PHONE
}

model OrderItem {
  id           String   @id @default(uuid())

  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])

  menuItemId   String
  menuItem     MenuItem @relation(fields: [menuItemId], references: [id])

  seatNumber   Int?
  quantity     Int      @default(1)
  price        Decimal  @db.Decimal(10,2) // price at time of order
  modifiers    String[] // ["medium-rare", "no onions"]

  // Kitchen display
  station      Station
  courseNumber Int      @default(1)

  // Status
  status       ItemStatus @default(PENDING)

  // Timing
  firedAt      DateTime?
  completedAt  DateTime?

  // Allergy info (copied from guest for display on ticket)
  allergies    String[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([orderId, station])
}

enum ItemStatus {
  PENDING
  FIRED
  COOKING
  READY
  SERVED
}
```

**Verificación:** `npx prisma validate`, migration creada

---

## TAREA 2: Order Creation Endpoint

```typescript
// Endpoint: POST /api/v1/orders
// Se llama desde tableside app (server) o POS terminal

export class CreateOrderDto {
  @IsUUID() tableId!: string;
  @IsUUID() @IsOptional() guestId?: string;
  @IsArray() items!: OrderItemDto[];
  @IsOptional() @IsString() occasion?: string;
  @IsOptional() @IsString() guestNotes?: string;
  @IsOptional() @IsEnum(OrderSource) source?: OrderSource;
}

export class OrderItemDto {
  @IsUUID() menuItemId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsInt() seatNumber?: number;
  @IsOptional() @IsArray() modifiers?: string[];
  @IsOptional() @IsInt() @Min(1) courseNumber?: number;
}

// LOGICA CRÍTICA:
// 1. Validar que table existe y está en status que permite orders (SEATED)
// 2. Para cada item: verificar is86 = false, copiar allergies del guest
// 3. Calcular subtotal, tax
// 4. Disparar evento 'order.placed' al event bus
```

**Al crear una order:**
1. Guardar en DB
2. **Inventario: deduct ingredients** ( TASK 3 )
3. **KDS: fire tickets a estaciones** ( TASK 4 )
4. **CRM: update guest profile** (evento)

**Verificación:**
- Crear order → items guardados + inventory deducted + tickets en KDS
- Item is86 → 400 error

---

## TAREA 3: Inventory Deduction (Triggered by Order)

```typescript
// orders/services/inventory-deduction.service.ts
async deductForOrder(orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: { include: { recipe: { include: { ingredients: true } } } } } }
    }
  });

  for (const item of order.items) {
    if (item.menuItem.recipe) {
      for (const ri of item.menuItem.recipe.ingredients) {
        await this.prisma.ingredient.update({
          where: { id: ri.ingredientId },
          data: {
            currentStock: { decrement: ri.quantity * item.quantity }
          }
        });
        // Check if below reorder threshold → trigger alert
        const ingredient = await this.prisma.ingredient.findUnique({ where: { id: ri.ingredientId } });
        if (ingredient.currentStock <= ingredient.reorderThreshold) {
          await this.eventBus.publish('inventory.low', { ingredientId: ri.ingredientId, tenantId: order.tenantId });
        }
      }
    }
  }
}
```

**Verificación:**
- Order de 2x "Ribeye" → deduce 2x (recipe quantity per steak) from inventory
- Si stock baja de threshold → alert disparado

---

## TAREA 4: KDS Ticket Engine

**El corazón del KDS:**
```typescript
// kitchen/services/kds-ticket-engine.service.ts

// Cuando llega evento 'order.placed'
async createTicketsForOrder(orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: true } },
      table: true,
      guest: true,
    }
  });

  // Group items by station
  const ticketsByStation = this.groupByStation(order.items);

  for (const [station, items] of Object.entries(ticketsByStation)) {
    const ticket = {
      id: generateUUID(),
      orderId: order.id,
      tableNumber: order.table.number,
      guestName: order.guest?.firstName || 'Walk-in',
      guestId: order.guestId,

      // VIP info para cook
      isVip: order.guest?.vipTier !== 'NONE',
      vipTier: order.guest?.vipTier,
      occasion: order.occasion,

      // Allergy alert (MÁS IMPORTANTE)
      allergies: items.flatMap(i => i.allergies),

      // Items
      items: items.map(i => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        seatNumber: i.seatNumber,
        modifiers: i.modifiers,
        courseNumber: i.courseNumber,
      })),

      // Timing
      createdAt: new Date(),
      targetTime: this.calculateTargetTime(items), // según tiempo promedio del item

      status: 'PENDING' as TicketStatus,
    };

    // Guardar en Redis para acceso rápido + broadcast
    await this.redis.set(`kds:ticket:${ticket.id}`, JSON.stringify(ticket));
    await this.redis.publish('kds:ticket.created', JSON.stringify({ station, ticket }));
  }
}
```

**Verificación:**
- Order creada → tickets aparecen en cada estación en <500ms
- Allergy visible en rojo en el ticket

---

## TAREA 5: KDS Endpoints (para pantallas)

```typescript
// kitchen/kds.controller.ts

@Get('/kds/station/:station')  // GET /api/v1/kds/station/GRILL
getStationTickets(
  @Param('station') station: Station,
  @Query('tenantId') tenantId: string
) {
  // Obtener tickets activos de Redis para esta estación
  // Ordenar por: priority (VIP > regular), then createdAt ASC (FIFO)
}

// GET /api/v1/kds/station/GRILL/ticket/:id
Get('/kds/station/:station/ticket/:id')
getTicket(@Param('station') station, @Param('id') id)

// PATCH /api/v1/kds/ticket/:id/status  → bump ticket
@Patch('/kds/ticket/:id/status')
updateTicketStatus(
  @Param('id') id: string,
  @Body() body: { status: TicketStatus }
)

// PATCH /api/v1/kds/ticket/:id/fire  → fire individual item
@Patch('/kds/ticket/:id/item/:itemId/fire')
fireItem(@Param('ticketId') ticketId, @Param('itemId') itemId)

// PATCH /api/v1/kds/ticket/:id/hold  → hold item
@Patch('/kds/ticket/:id/item/:itemId/hold')
holdItem(@Param('ticketId') ticketId, @Param('itemId') itemId)

// POST /api/v1/kds/ticket/:id/send-to-table
@Post('/kds/ticket/:id/send-to-table')
sendToTable(@Param('id') ticketId)
```

**Expire el ticket:**
- Si todos los items de una estación están en READY → ticket listo para expo
- Expo view muestra cross-station status

**Verificación:**
- Ver endpoint de station → lista de tickets ordenados por tiempo
- Bump ticket → status cambia, evento WebSocket a todas las pantallas

---

## TAREA 6: Expo / Pass View

```typescript
// GET /api/v1/kds/expo/:tenantId
// Muestra estado cross-station para TODOS los tickets activos

{
  "data": {
    "tickets": [
      {
        "id": "ticket-123",
        "tableNumber": 7,
        "guestName": "John D.",
        "isVip": true,
        "allergies": ["shellfish"],
        "occasion": "Anniversary",
        "stations": {
          "GRILL": { "items": 3, "ready": 2, "status": "IN_PROGRESS" },
          "COLD":  { "items": 1, "ready": 0, "status": "PENDING" },
          "PASTRY":{"items": 1, "ready": 0, "status": "PENDING" }
        },
        "elapsedTime": 320, // seconds
        "targetTime": 480, // seconds
        "status": "IN_PROGRESS"
      }
    ]
  }
}
```

**Lógica:**
- Ticket está READY cuando TODAS las estaciones tienen todos sus items en READY
- Expo puede hacer "Send to Table" cuando ticket está ready

**Verificación:**
- Expo ve todas las estaciones de una mesa
- "Send to table" cuando todo listo

---

## TAREA 7: Course & Timing Controls

```typescript
// kitchen/services/course-timer.service.ts

// Hold: server marca que item no fire hasta que se indique
// Fire: server indica que ahora sí se mande a cocina

interface CourseHold {
  orderId: string;
  itemId: string;
  heldBy: string; // serverId
  heldUntil: Date | null; // null = hasta que se haga fire manualmente
}

// Job que revisa holds expirados y los dispara automáticamente
@Process('course-timer-check')
async checkCourseTimers(job: Job) {
  // Cada 30 segundos: revisar holds
  // Si holdUntil pasó → fire item automáticamente
}
```

**Timer en ticket:**
```typescript
interface TicketTimer {
  startedAt: Date;
  targetSeconds: number; // según categoría de items
  warningAt: number; // ej: 80% del target → amber
  criticalAt: number; // ej: 100% del target → red
}

// Frontend KDS muestra countdown con colores
// Si overdue → alert a manager
```

**Verificación:**
- Server marca item "hold" → no aparece en ticket hasta fire
- Timer rojo cuando overdue → manager recibe alert

---

## TAREA 8: 86 Item Broadcast

```typescript
// menu-items/menu-items.service.ts
async toggle86(itemId: string, is86: boolean) {
  await this.prisma.menuItem.update({
    where: { id: itemId },
    data: { is86 }
  });

  // Broadcast a TODOS los dispositivos
  await this.eventBus.publish('menu.item.86', {
    menuItemId: itemId,
    is86,
    tenantId: getCurrentTenantId()
  });
}
```

**Devices que reciben el broadcast:**
- POS terminals (ya no mostrar item)
- Tableside app (server ve que está 86)
- KDS (item no aparece en nuevo orders)
- Web menu (indicador "86")

**Verificación:**
- Chef marca ribeye como 86 → en <1s aparece en todas partes como no disponible

---

## TAREA 9: Offline Reliability

```typescript
// El KDS debe funcionar aunque internet caiga

// Strategy: PWA con Service Worker + local state
// 1. KDS screen almacena tickets en IndexedDB local
// 2. Si pierde conexión, sigue mostrando tickets
// 3. Server marca items como "pending_sync"
// 4. Cuando conexión vuelve, sync automática

// Para el POS/tableside:
// - Si pierde conexión, permite crear orders localmente
// - Cola local: cuando vuelve, sube orders al server

// Implementar:
// - Service worker en web app KDS
// - IndexedDB para cache de tickets
// - Sync queue en localStorage
```

**Verificación:**
- Simular desconexión → KDS sigue funcionando
- Reconexión → orders pendientes se sync automatically

---

## TAREA 10: WebSocket Events

```typescript
// kitchen/events/kds.events.ts

// Channel: kds:${tenantId}:station:${stationName}
// Events:
// - ticket.created
// - ticket.updated
// - ticket.bumped
// - ticket.sent-to-table
// - station.86

// Frontend KDS se subscribe al canal de su estación
```

**Verificación:**
- Nuevo ticket creado → aparece en KDS screen en <500ms
- Bump ticket → actualizado en todas partes

---

## TAREA 11: Tests

```typescript
describe('KDSService', () => {
  it('should create tickets grouped by station');
  it('should show allergies in red on ticket');
  it('should mark VIP tickets with gold border');
  it('should bump ticket item when marked ready');
  it('should fire held item when released');
  it('should show correct elapsed time on ticket');
  it('should broadcast 86 to all devices');
  it('should NOT allow order of 86 item');
  it('should deduct inventory on order creation');
  it('should trigger low-stock alert when threshold crossed');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 12: KDS UI Screens

```
/kds/-station/[station]  → pantalla por estación (GRILL, COLD, etc.)
/kds/expo                → pantalla expo (todas las estaciones)
/kds/config              → configuración de tiempos, thresholds
```

**Componentes KDS:**
```typescript
// TicketCard
// - Guest name (prominent)
// - Table + seat
// - Allergies (RED background)
// - VIP badge (gold)
// - Items list with modifiers
// - Timer (green/amber/red based on elapsed)
// - Bump button per item
// - Fire/Hold buttons

// StationHeader
// - Station name
// - Ticket count
// - Average time

// TimerDisplay
// - Countdown
// - Color coding
```

**UX Requirements (CRITICAL):**
- Allergy information → MOST VISIBLE on ticket (red background, large font)
- VIP indicator → gold border or badge
- All critical actions reachable in MAX 2 taps
- Buttons min 44px for wet/cooked hands

**Verificación:**
- Ticket con allergy → red background en todo el ticket
- VIP guest → gold badge visible desde 3 metros

---

## ENTREGABLE

```
apps/api/src/modules/
├── orders/
│   ├── orders.controller.ts      ✅
│   ├── orders.service.ts         ✅
│   ├── dto/                      ✅
│   └── orders.service.spec.ts
├── kitchen/
│   ├── kds.controller.ts        ✅
│   ├── kds.service.ts            ✅
│   ├── kds-ticket-engine.service.ts ✅
│   ├── course-timer.service.ts  ✅
│   └── kds.service.spec.ts
├── menu-items/
│   ├── menu-items.controller.ts ✅
│   └── menu-items.service.ts     ✅ (86 broadcast)
└── jobs/
    └── course-timer-check.processor.ts

apps/web/
├── hooks/useKDS.ts
├── pages/kds/
│   ├── station/[station].tsx    ✅
│   ├── expo.tsx                ✅
│   └── config.tsx
└── components/kds/
    ├── TicketCard/
    ├── StationHeader/
    ├── TimerDisplay/
    └── BumpButton/

packages/ui/src/components/
├── KDSTicketCard/
├── StationView/
└── ExpoDashboard/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. KDS endpoint responde: GET /kds/station/GRILL → lista de tickets
6. Order creada → tickets en todas las estaciones en <500ms
7. Allergy visible como rojo en ticket
8. VIP badge visible en ticket
9. Bump → WebSocket broadcast a todas las pantallas
10. 86 broadcast llega a todos los dispositivos en <1s
11. Offline mode → KDS sigue funcionando
12. Aislamiento de tenant verificado

---

## PREGUNTA DE APROBACIÓN

Kitchen Command System (KDS) completo: tickets por estación, allergies prominently displayed, VIP badges, course controls, expo view, 86 broadcast, y offline reliability.

**¿Avanzamos a la PROMPT-5 — Inventory & Procurement?**