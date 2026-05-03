# PROMPT FASE 5 — INVENTORY & PROCUREMENT

**Por qué es importante:** Sin inventario preciso, el restaurante pierde dinero por merma, no sabe cuándo reorder, y no puede calcular el costo real de cada plato. Este módulo conecta el menú con los ingredientes para saber en todo momento qué hay, cuánto cuesta, y cuándo pedir más.

---

## TAREA 1: Modelos Prisma para Inventory

```prisma
model Ingredient {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  name            String
  unit            String   // "g", "ml", "kg", "L", "each", "portions"
  category        String   // "proteins", "produce", "dry goods", "beverages"

  // Stock levels
  currentStock    Decimal  @db.Decimal(12,4) @default(0)
  unitCost        Decimal  @db.Decimal(10,4)  // cost per unit
  reorderThreshold Decimal @db.Decimal(12,4) @default(0)
  parLevel        Decimal  @db.Decimal(12,4) @default(0) // desired stock level

  // Supplier
  supplierId      String?
  supplier        Supplier? @relation(fields: [supplierId], references: [id])
  supplierSku     String?

  // Waste tracking
  wasteCostYtd    Decimal  @db.Decimal(10,2) @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  recipeIngredients RecipeIngredient[]

  @@index([tenantId, category])
  @@index([tenantId, currentStock])
}

model Supplier {
  id        String   @id @default(uuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  name      String
  contactName String?
  email     String?
  phone     String?

  isPreferred Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ingredients Ingredient[]

  @@unique([tenantId, name])
}

model WasteLog {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])

  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])

  quantity     Decimal  @db.Decimal(12,4)
  reason       String   // "spoilage", "preparation", "customer return"
  cost         Decimal  @db.Decimal(10,2)
  notes        String?

  loggedBy     String   // userId
  loggedAt     DateTime @default(now())

  @@index([tenantId, loggedAt])
}
```

**Verificación:** `npx prisma validate`, migration creada

---

## TAREA 2: Recipe Costing Engine

```typescript
// inventory/services/recipe-costing.service.ts

interface RecipeCostResult {
  recipeId: string;
  menuItemId: string;
  totalCost: number;
  ingredientCosts: {
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
  costPercentage: number;  // cost / price * 100
  margin: number;          // price - cost
  marginPercentage: number;
}

// Calcular costo de un plato
async calculateRecipeCost(menuItemId: string): Promise<RecipeCostResult> {
  const menuItem = await this.prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      recipe: {
        include: {
          ingredients: { include: { ingredient: true } }
        }
      }
    }
  });

  let totalCost = 0;
  const ingredientCosts = [];

  for (const ri of menuItem.recipe.ingredients) {
    const cost = Number(ri.quantity) * Number(ri.ingredient.unitCost);
    totalCost += cost;
    ingredientCosts.push({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      quantity: Number(ri.quantity),
      unit: ri.ingredient.unit,
      cost,
    });
  }

  const price = Number(menuItem.price);
  return {
    recipeId: menuItem.recipe.id,
    menuItemId: menuItem.id,
    totalCost,
    ingredientCosts,
    costPercentage: (totalCost / price) * 100,
    margin: price - totalCost,
    marginPercentage: ((price - totalCost) / price) * 100,
  };
}

// Batch: costo de todos los platos del menú
async calculateAllMenuCosts(tenantId: string): Promise<RecipeCostResult[]> {
  const menuItems = await this.prisma.menuItem.findMany({
    where: { tenantId, recipe: { isNot: null } }
  });
  return Promise.all(menuItems.map(m => this.calculateRecipeCost(m.id)));
}
```

**Verificación:**
- Ribeye con receta → costo $18.50, precio $65, margen 71.5%
- Cambio en costo de beef → recalcula automáticamente

---

## TAREA 3: Inventory Tracking Endpoints

```typescript
// inventory/inventory.controller.ts

// Ingredientes
GET    /api/v1/inventory/ingredients        → lista con stock actual
GET    /api/v1/inventory/ingredients/:id    → detalle
PATCH  /api/v1/inventory/ingredients/:id    → actualizar (stock manual adjustment)
POST   /api/v1/inventory/ingredients         → crear ingrediente

// Stock Operations
POST   /api/v1/inventory/receive            → recibir mercancia (update stock)
POST   /api/v1/inventory/waste               → log waste
GET    /api/v1/inventory/low-stock           → ingredientes bajo threshold
GET    /api/v1/inventory/reorder-suggestions → sugerencias de reorder

// Reports
GET    /api/v1/inventory/usage/:dateRange   → uso por ingrediente
GET    /api/v1/inventory/costs/menu         → costo por plato del menú
GET    /api/v1/inventory/waste-report       → waste por período
```

**DTOs:**
```typescript
export class ReceiveInventoryDto {
  @IsUUID() ingredientId!: string;
  @IsNumber() quantity!: number; // positivo para agregar
  @IsOptional() @IsNumber() unitCost?: number; // si cambió precio
  @IsOptional() @IsString() notes?: string;
}

export class WasteLogDto {
  @IsUUID() ingredientId!: string;
  @IsNumber() quantity!: number;
  @IsString() reason!: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateIngredientDto {
  @IsOptional() @IsNumber() currentStock?: number;
  @IsOptional() @IsNumber() reorderThreshold?: number;
  @IsOptional() @IsNumber() parLevel?: number;
  @IsOptional() @IsUUID() supplierId?: string;
}
```

**Verificación:**
- Receive 5kg beef → currentStock += 5
- Waste log → wasteCostYtd actualizado
- Low stock → ingrediente aparece en lista

---

## TAREA 4: Low-Stock Alert System

```typescript
// jobs/low-stock-alert.processor.ts

// Cuando evento 'inventory.low' llega:
// 1. Buscar ingrediente con supplier info
// 2. Generar sugerencia de purchase order
// 3. Notificar al manager (dashboard + email/SMS)

@Processor('inventory-alerts')
export class LowStockAlertProcessor {
  @Process('inventory.low')
  async handleLowStock(job: Job) {
    const { ingredientId, tenantId } = job.data;

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { supplier: true }
    });

    // Crear alerta en dashboard
    await this.prisma.notification.create({
      data: {
        tenantId,
        type: 'LOW_STOCK',
        title: `Low Stock: ${ingredient.name}`,
        message: `Current: ${ingredient.currentStock} ${ingredient.unit}. Suggest reorder: ${ingredient.parLevel} ${ingredient.unit}`,
        data: { ingredientId, suggestedOrderQty: Number(ingredient.parLevel) - Number(ingredient.currentStock) }
      }
    });

    // Enviar email/SMS si configurado
    if (ingredient.supplier?.email) {
      await this.emailService.sendLowStockAlert(ingredient);
    }
  }
}
```

**Verificación:**
- Stock baja de reorderThreshold → notificación en dashboard <5s
- Email enviado al manager con supplier info

---

## TAREA 5: Menu Engineering Report

```typescript
// inventory/services/menu-engineering.service.ts

interface MenuQuadrant {
  stars: MenuItemProfitability[];    // high margin + high popularity
  puzzles: MenuItemProfitability[];  // high margin + low popularity
  workhorses: MenuItemProfitability[]; // low margin + high popularity
  dogs: MenuItemProfitability[];      // low margin + low popularity
}

interface MenuItemProfitability {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  marginPercentage: number;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

// Calcular cuadrante para cada plato
async calculateMenuQuadrants(tenantId: string, startDate: Date, endDate: Date): Promise<MenuQuadrant> {
  // 1. Obtener todas las ordenes del período
  // 2. Group por menu item → total sold, total revenue
  // 3. Para cada item: calcular costo y margen
  // 4. Clasificar según thresholds configurables
}
```

**Quadrant Logic:**
```
Stars: margin > 65% AND sold > 10/week
Puzzles: margin > 65% AND sold <= 10/week
Workhorses: margin <= 65% AND sold > 10/week
Dogs: margin <= 65% AND sold <= 10/week
```

**Recommendations:**
```typescript
{
  "stars": ["Ribeye", "Lobster Tail"], // → "Consider raising prices"
  "puzzles": ["Veggie Main"], // → "Promote more or reprice"
  "workhorses": ["Caesar Salad"], // → "Cost reduction project"
  "dogs": ["Daily Soup"], // → "Reconsider on menu"
}
```

**Verificación:**
- 30 días de datos → cuadrantes calculados correctamente
- Recomendaciones lógicas

---

## TAREA 6: Waste & Variance Tracking

```typescript
// Reporte: teórica vs actual
interface VarianceReport {
  ingredientId: string;
  ingredientName: string;
  unit: string;

  theoreticalUsage: number;  // basado en recipes x orders
  actualUsage: number;        // start stock + received - end stock
  variance: number;            // actual - theoretical
  variancePercentage: number;
  varianceCost: number;

  period: { start: Date; end: Date };
}

// Cálculo:
// theoreticalUsage = SUM(orderItem.quantity * recipeIngredient.quantity)
// actualUsage = startStock + received - endStock
```

**Job de fin de service:**
```typescript
@Process('end-of-service-variance')
async calculateDailyVariance(job: Job) {
  const { tenantId, date } = job.data;
  // Para cada ingrediente:
  // 1. startOfDay stock
  // 2. + received today
  // 3. - current stock
  // 4. - theoretical usage from orders
  // = variance
}
```

**Verificación:**
- Variance > 15% → flagged en el reporte
- Waste report muestra costo por ingrediente y por razón

---

## TAREA 7: Purchase Order Generation

```typescript
// Endpoints
POST /api/v1/inventory/purchase-orders        → crear PO
GET  /api/v1/inventory/purchase-orders       → lista de POs
GET  /api/v1/inventory/purchase-orders/:id   → detalle
PATCH /api/v1/inventory/purchase-orders/:id/status → approve, send, receive

// Al generar PO automáticamente:
async generateReorderPO(tenantId: string) {
  const lowStock = await this.getLowStockIngredients(tenantId);

  const po = {
    tenantId,
    supplierId: lowStock[0].supplierId, // agrupar por supplier
    items: lowStock.map(i => ({
      ingredientId: i.id,
      quantity: Number(i.parLevel) - Number(i.currentStock),
      unitCost: Number(i.unitCost),
    })),
    status: 'DRAFT',
    totalCost: ...
  };

  return this.prisma.purchaseOrder.create({ data: po });
}
```

**Verificación:**
- Crear PO → items con cantidad sugerida
- Approve → se puede enviar al supplier

---

## TAREA 8: Tests

```typescript
describe('InventoryService', () => {
  it('should calculate recipe cost correctly');
  it('should update stock on receive');
  it('should log waste and update waste cost');
  it('should trigger low-stock alert below threshold');
  it('should calculate menu quadrant correctly');
  it('should calculate variance theoretical vs actual');
  it('should generate purchase order suggestion');
  it('should NOT allow negative stock');
  it('should track costs per ingredient accurately');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## TAREA 9: Inventory UI (Web)

```
/inventory                → dashboard de inventory
/inventory/ingredients     → lista de ingredientes
/inventory/ingredients/[id] → detalle + historial de movimiento
/inventory/menu-costs     → costos del menú
/inventory/waste          → reporte de waste
/inventory/orders         → purchase orders
```

**Componentes:**
```typescript
IngredientCard
StockLevelBar      // visual bar showing current vs par
LowStockAlert
MenuCostTable      // profitability table
WasteReport
PurchaseOrderForm
```

**Verificación:**
- Stock bajo → alert visual en dashboard
- Recipe costing visible en cada plato

---

## ENTREGABLE

```
apps/api/src/modules/
├── inventory/
│   ├── inventory.controller.ts      ✅
│   ├── inventory.service.ts          ✅
│   ├── recipe-costing.service.ts     ✅
│   ├── menu-engineering.service.ts  ✅
│   ├── waste-tracking.service.ts    ✅
│   ├── dto/                         ✅
│   └── inventory.service.spec.ts
├── ingredients/
│   ├── ingredients.controller.ts
│   └── ingredients.service.ts
└── jobs/
    ├── low-stock-alert.processor.ts
    └── end-of-service-variance.processor.ts

apps/web/
├── hooks/useInventory.ts
├── pages/inventory/
│   ├── index.tsx
│   ├── ingredients/
│   ├── menu-costs.tsx
│   ├── waste.tsx
│   └── orders.tsx
└── components/inventory/

packages/ui/src/components/
├── IngredientCard/
├── StockLevelBar/
└── MenuCostTable/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Recipe costing: costo calculado correctamente
6. Stock actualizado en tiempo real después de order
7. Low-stock alert disparado cuando threshold cruzado
8. Menu engineering report muestra cuadrantes correctos
9. Waste tracking: teórica vs actual con variance > 15% flagged
10. Purchase order genera con cantidades correctas

---

## PREGUNTA DE APROBACIÓN

Inventory & Procurement completo: recipe costing, real-time stock tracking, low-stock alerts, menu engineering report, waste variance tracking, y purchase order generation.

**¿Avanzamos a la PROMPT-6 — Staff Ops + POS?**