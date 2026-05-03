# PROMPT FASE 7 — ANALYTICS + DASHBOARD

**Por qué es importante:** Sin visibilidad en tiempo real y reportes históricos, el manager está ciego. Este módulo da la imagen completa: qué se vende, cuándo, por quién, y cómo está operando el restaurante. Es donde se validan las decisiones con datos.

---

## TAREA 1: Real-Time Service Dashboard

```typescript
// analytics/dashboard.service.ts

interface LiveDashboard {
  // Moment right now
  timestamp: Date;

  // Revenue
  revenueToday: number;
  revenueGoal: number;
  revenueProgress: number; // percentage

  // Covers
  coversToday: number;
  coversGoal: number;
  averageSpendPerCover: number;

  // Active tables
  totalTables: number;
  seatedTables: number;
  availableTables: number;
  avgTurnTime: number; // minutes

  // Kitchen
  avgTicketTime: number; // seconds
  ticketsInProgress: number;
  ticketsOverdue: number;

  // Service
  currentStaffOnDuty: number;
  reservationsConfirmed: number;
  waitlistLength: number;
}

async function getLiveDashboard(tenantId: string): Promise<LiveDashboard>
```

**Endpoint:**
```
GET /api/v1/analytics/dashboard/live
```

**WebSocket para auto-refresh:**
```typescript
// Channel: dashboard:${tenantId}
// Event: dashboard.updated cada 30 segundos
// O cuando hay cambio significativo (nueva orden, mesa seated, etc.)
```

**UI en web:**
```typescript
// apps/web/src/pages/dashboard/index.tsx

// Grid layout:
// [Revenue Today] [Covers] [Avg Ticket Time]
// [Turn Time]     [Tables Status pie chart]
// [Top Selling Items]
// [Active Reservations list]
```

**Verificación:**
- Dashboard carga en <500ms
- Actualiza cada 30s via WebSocket
- Datos accurados vs DB

---

## TAREA 2: Sales & Revenue Reports

```typescript
// analytics/reports.service.ts

// Revenue by period
interface RevenueReport {
  period: { start: Date; end: Date };
  granularity: 'hour' | 'day' | 'week' | 'month';

  totalRevenue: number;
  totalOrders: number;
  totalCovers: number;
  averageOrderValue: number;
  averageSpendPerCover: number;

  byPeriod: {
    label: string;  // "Monday", "Jan 2025"
    revenue: number;
    orders: number;
    covers: number;
  }[];

  // Comparison vs previous period
  revenueVsPrevious: number; // % change
  coversVsPrevious: number;
}
```

**Endpoints:**
```
GET /api/v1/analytics/reports/revenue
  ?period=day|week|month|year
  &startDate=2025-01-01
  &endDate=2025-01-31
  &compare=true

GET /api/v1/analytics/reports/revenue/by-item
  ?startDate=...
  &endDate=...

GET /api/v1/analytics/reports/revenue/by-category
GET /api/v1/analytics/reports/revenue/by-server
GET /api/v1/analytics/reports/revenue/by-table
```

**DTOs:**
```typescript
export class RevenueReportDto {
  @IsOptional() @IsEnum('hour' | 'day' | 'week' | 'month') period?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() compare?: boolean;
}
```

**Verificación:**
- Revenue por día → números correctos
- Comparación vs período anterior → % change calculado

---

## TAREA 3: Operational Reports

```typescript
interface OperationalReport {
  // Table metrics
  avgTurnTime: number; // minutes
  turnTimeTarget: number;
  tablesTurned: number;
  turnTimeByTable: { tableId: string; avgTurnTime: number; turns: number }[];

  // No-show & deposit
  reservationNoShowRate: number;
  depositRecoveryRate: number;

  // Labor
  laborCostPercentage: number;
  laborCostVsTarget: number;
  staffHoursWorked: number;

  // Kitchen
  avgTicketTime: number;
  ticketsOnTimeRate: number; // % dentro del target
  ticketsOverdueRate: number;
}
```

**Endpoints:**
```
GET /api/v1/analytics/reports/operational
GET /api/v1/analytics/reports/tables/turn-times
GET /api/v1/analytics/reports/kitchen/performance
```

**Verificación:**
- Avg turn time = SUM(table seated to cleared) / num turns
- No-show rate = no_shows / total reservations

---

## TAREA 4: Guest Analytics

```typescript
// analytics/guest-analytics.service.ts

interface GuestAnalytics {
  period: { start: Date; end: Date };

  // Volume
  newGuests: number;
  returningGuests: number;
  retentionRate: number; // returning / total * 100

  // LTV
  totalGuests: number;
  averageLTV: number;
  topGuests: { guestId: string; name: string; ltv: number; visits: number }[];

  // Behavior
  avgVisitsPerGuest: number;
  avgSpendPerVisit: number;

  // Campaigns (si marketing automation activo)
  emailOpenRate: number;
  emailClickRate: number;
  reservationConversion: number;
}
```

**Endpoints:**
```
GET /api/v1/analytics/guests/summary
GET /api/v1/analytics/guests/retention
GET /api/v1/analytics/guests/top
GET /api/v1/analytics/guests/cohorts
```

**Retention cohort query:**
```sql
-- Guests who visited in period X, how many returned in period Y
SELECT
  date_trunc('month', first_visit) as cohort_month,
  COUNT(*) as cohort_size,
  SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END) as retained,
  SUM(CASE WHEN visit_count > 3 THEN 1 ELSE 0 END) as highly_retained
FROM guests
GROUP BY cohort_month
ORDER BY cohort_month DESC
```

**Verificación:**
- Retention rate 30/60/90-day cohorts calculados
- Top guests ordenados por LTV

---

## TAREA 5: Menu Performance Report

```typescript
// Combina data del inventory (recipe costing) con orders

interface MenuPerformanceReport {
  items: {
    menuItemId: string;
    name: string;
    category: string;
    price: number;
    cost: number;
    margin: number;
    marginPercentage: number;

    // Sales
    quantitySold: number;
    revenue: number;
    profit: number;

    // Mix
    mixPercentage: number; // % del total de items vendidos
    rank: number; // por revenue
  }[];

  summary: {
    totalItems: number;
    totalRevenue: number;
    totalProfit: number;
    avgMargin: number;
    starsCount: number; // high margin + high volume
    dogsCount: number; // low margin + low volume
  };
}
```

**Endpoints:**
```
GET /api/v1/analytics/reports/menu/performance
  ?startDate=2025-01-01
  &endDate=2025-01-31
  &category=starters|mains|desserts|wine
```

**Verificación:**
- Top item por revenue coincide con datos de orders
- Margin % calculado correctamente

---

## TAREA 6: Multi-Location Support (Phase 2 ready)

```typescript
// Para restaurant groups con múltiples venues

interface MultiLocationDashboard {
  locations: {
    tenantId: string;
    name: string;
    revenueToday: number;
    coversToday: number;
    avgTicketTime: number;
  }[];

  totalRevenue: number;
  totalCovers: number;

  // Rankings
  topLocation: string;
  bottomLocation: string;
  locationVsLocation: { tenantId1: string; tenantId2: string; revenueDiff: number }[];
}
```

**Endpoints:**
```
GET /api/v1/analytics/multi-location/overview
GET /api/v1/analytics/multi-location/:tenantId/dashboard
GET /api/v1/analytics/multi-location/compare
```

**Verificación:**
- Owner ve todos los locales en un dashboard
- Puedo filtrar por local específico

---

## TAREA 7: Export Reports

```typescript
// Export to CSV/PDF
// Para accounting y análisis externo

POST /api/v1/analytics/reports/export
{
  "reportType": "revenue" | "operational" | "guest" | "menu",
  "format": "csv" | "pdf",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filters": { ... }
}

// Response: file download (application/pdf or text/csv)
// O: URL to download

// Para PDF: usar puppeteer o similar server-side
// Para CSV: generar con papaparse o built-in
```

**Verificación:**
- Descarga CSV con datos correctos
- Descarga PDF formateado correctamente

---

## TAREA 8: Analytics UI

```
/analytics               → dashboard principal
/analytics/revenue       → reportes de revenue
/analytics/operational   → reportes operativos
/analytics/guests        → analíticas de guests
/analytics/menu          → performance del menú
/analytics/export        → exportar datos
```

**Dashboard components:**
```typescript
// RealTimeStats (actualiza cada 30s)
// PeriodSelector (today, this week, this month, custom)
// DateRangePicker (para reportes)
// ReportTable (sortable, exportable)
// Chart (bar, line, pie) — usar Recharts o similar
// ExportButton (CSV/PDF)
```

**Verificación:**
- Dashboard carga <1s
- Charts renderizan correctamente
- Export genera archivo descargable

---

## TAREA 9: Tests

```typescript
describe('AnalyticsService', () => {
  it('should calculate revenue by period');
  it('should compare vs previous period');
  it('should calculate retention cohort correctly');
  it('should return top guests by LTV');
  it('should calculate menu performance correctly');
  it('should calculate avg turn time');
  it('should export CSV with correct data');
  it('should calculate labor cost percentage');
  it('should aggregate multi-location data');
});
```

**Verificación:** tests pasan, coverage ≥ 80%

---

## ENTREGABLE

```
apps/api/src/modules/
├── analytics/
│   ├── analytics.controller.ts  ✅
│   ├── analytics.service.ts     ✅
│   ├── dashboard.service.ts     ✅
│   ├── reports.service.ts      ✅
│   ├── guest-analytics.service.ts
│   ├── menu-performance.service.ts
│   ├── dto/
│   └── analytics.service.spec.ts

apps/web/
├── pages/analytics/
│   ├── index.tsx               ✅ dashboard
│   ├── revenue.tsx
│   ├── operational.tsx
│   ├── guests.tsx
│   ├── menu.tsx
│   └── export.tsx
├── components/
│   ├── charts/
│   ├── ReportTable/
│   └── DateRangePicker/
└── hooks/
    └── useAnalytics.ts
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. Dashboard live carga <500ms
6. Revenue report con comparison correcto
7. Retention cohort query funciona
8. Export CSV/PDF genera correctamente
9. Multi-location aggregation funciona

---

## PREGUNTA DE APROBACIÓN

Analytics + Dashboard completo: real-time dashboard, revenue reports, operational reports, guest analytics, menu performance, multi-location support, y export functionality.

**¿Avanzamos a la PROMPT-8 — Marketing Automation + Notifications?**