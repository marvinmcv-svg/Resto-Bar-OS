# PROMPT FASE 2 — MÓDULO GUESTS/CRM

**Por qué es importante:** Los perfiles de invitados son el activo más valioso del restaurante. Este módulo captura TODO sobre cada persona que cena: historial de visitas, preferencias de asientos, restricciones dietéticas, ocasiones especiales, y comportamientos automatizados. Todo fluye desde y hacia este módulo.

---

## TAREA 1: Modelos Prisma para Guests

```prisma
model Guest {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  // Info básica
  email           String?
  phone           String?
  firstName       String
  lastName        String?
  preferredName   String?

  // Preferencias
  seatingPref    String?   // "window", "booth", "quiet section"
  dietaryNotes   String?   // libre
  allergies      String[]  // ["gluten", "nuts", "shellfish"]

  // Metadatos
  vipTier         VipTier  @default(NONE)
  lifetimeValue   Decimal  @default(0)
  visitCount      Int      @default(0)
  lastVisit       DateTime?
  averageSpend    Decimal  @default(0)

  // Tags auto-aplicados
  tags            String[] // ["VIP", "Wine Enthusiast", "High Spender", "Regular", "Lapsed"]

  // Notes staff
  staffNotes      String?

  // Marketing consent
  emailOptIn      Boolean  @default(true)
  smsOptIn        Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  reservations    Reservation[]
  orders          Order[]

  @@unique([tenantId, email])
  @@unique([tenantId, phone])
  @@index([tenantId, lastVisit])
  @@index([tenantId, vipTier])
}

enum VipTier {
  NONE
  BRONZE
  SILVER
  GOLD
  PLATINUM
}
```

**Verificación:** `npx prisma validate` pasa, migration creada

---

## TAREA 2: CRUD Endpoints para Guests

**Rutas:**
```
GET    /api/v1/guests          → lista con filtros (search, tier, tag)
GET    /api/v1/guests/:id      → detalle
POST   /api/v1/guests          → crear perfil
PATCH  /api/v1/guests/:id      → actualizar
DELETE /api/v1/guests/:id      → soft delete o hard delete (decidir)

GET    /api/v1/guests/search   → búsqueda rápida (nombre, email, phone)
GET    /api/v1/guests/:id/history → historial de visitas
```

**DTOs con class-validator:**
```typescript
export class CreateGuestDto {
  @IsString() @MinLength(2) firstName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsArray() allergies?: string[];
  @IsOptional() @IsString() seatingPref?: string;
}

export class UpdateGuestDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsArray() allergies?: string[];
  @IsOptional() @IsString() seatingPref?: string;
  @IsOptional() @IsString() dietaryNotes?: string;
  @IsOptional() @IsString() staffNotes?: string;
  @IsOptional() @IsEnum(VipTier) vipTier?: VipTier;
}
```

**Búsqueda full-text:**
```typescript
// En GuestService
async search(tenantId: string, query: string) {
  return this.prisma.guest.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ]
    },
    take: 20,
  });
}
```

**Verificación:**
- Crear guest → 201 + datos devueltos
- Buscar guest por nombre → resultados correctos
- Filtrar por tier → resultados correctos

---

## TAREA 3: Auto-Tagging Engine

**Tags automáticos por comportamiento:**

| Tag | Condición |
|-----|-----------|
| `VIP` | lifetimeValue > $5000 OR visitCount > 10 |
| `High Spender` | averageSpend > $300 por visita |
| `Wine Enthusiast` | 20%+ de órdenes incluyen wine |
| `Regular` | visita al menos 1x/mes por 3+ meses |
| `First Visit` | visitCount === 1 |
| `Lapsed (90+)` | última visita > 90 días |
| `Event Guest` | reservado evento especial |
| `Birthday` | visita en cumpleaños (mes/día) |

**Implementación:**
```typescript
// guests/services/tagging.service.ts
// Se dispara después de cada Order completada
async recalculateTags(guestId: string) {
  const guest = await this.getGuestWithOrders(guestId);
  const tags = new Set(guest.tags);

  // Calculate based on behavior
  if (guest.lifetimeValue > 5000) tags.add('VIP');
  if (guest.averageSpend > 300) tags.add('High Spender');
  if (this.isLapsed(guest.lastVisit)) tags.add('Lapsed (90+)');

  await this.prisma.guest.update({
    where: { id: guestId },
    data: { tags: Array.from(tags) }
  });
}
```

**Verificación:**
- Nuevo guest con 0 visits → tag "First Visit"
- Guest con >90 días sin visita → tag "Lapsed (90+)"
- Guest con $6000 lifetime → tag "VIP"

---

## TAREA 4: VIP Tier Calculation

**Tiers configurables:**
```typescript
// Configurable por tenant (en settings o env)
const VIP_TIERS = {
  BRONZE: { minSpend: 1000, minVisits: 3 },
  SILVER: { minSpend: 3000, minVisits: 6 },
  GOLD:   { minSpend: 7000, minVisits: 12 },
  PLATINUM: { minSpend: 15000, minVisits: 24 },
};
```

**Recalcular:**
- Después de cada Order completada
- Job nocturno batch para todos los guests

```typescript
// guests/services/tier-calculation.service.ts
async recalculateAllGuestTiers(tenantId: string) {
  const guests = await this.prisma.guest.findMany({ where: { tenantId } });
  for (const guest of guests) {
    const newTier = this.calculateTier(guest);
    if (guest.vipTier !== newTier) {
      await this.prisma.guest.update({
        where: { id: guest.id },
        data: { vipTier: newTier }
      });
    }
  }
}
```

**Verificación:**
- Guest con $6500 lifetime y 15 visits → GOLD
- Cambio de tier → log en analytics

---

## TAREA 5: Historial de visitas del guest

**Endpoint:**
```
GET /api/v1/guests/:id/history
```

**Respuesta:**
```json
{
  "data": {
    "guestId": "uuid",
    "totalVisits": 12,
    "totalSpend": "$8,450",
    "averageSpend": "$704",
    "lastVisit": "2025-04-15",
    "visits": [
      {
        "date": "2025-04-15",
        "table": "7",
        "server": "Maria G.",
        "coverCount": 2,
        "totalSpend": "$850",
        "orders": [" tasting menu x2", " wine pairing"]
      },
      ...
    ]
  }
}
```

**Verificación:**
- Ver historial → datos completos de últimas visitas
- Especial occasion visible en visit

---

## TAREA 6: Integración con módulo Reservations

**Cuando llega una Reservation:**
1. Buscar guest por email/phone existente
2. Si no existe → crear nuevo guest
3. Mostrar alerts en el floor plan si guest tiene:
   - allergies (mostrar en rojo en ticket)
   - VIP tier (mostrar en gold)
   - special occasion (mostrar "🎂 Anniversary" en la mesa)
   - seating preference

**Verificación:**
- Reservation con guest existente → completa info en la reserva
- Guest con allergies → visible en host stand y KDS ticket

---

## TAREA 7: Guest endpoints para Web (React)

**Hooks de TanStack Query:**
```typescript
// apps/web/hooks/useGuests.ts
export function useGuests(search?: string, tier?: VipTier) {
  return useQuery({
    queryKey: ['guests', search, tier],
    queryFn: () => apiClient.get('/api/v1/guests', { params: { search, tier } }),
  });
}

export function useGuest(id: string) {
  return useQuery({
    queryKey: ['guest', id],
    queryFn: () => apiClient.get(`/api/v1/guests/${id}`),
    enabled: !!id,
  });
}

export function useGuestHistory(id: string) {
  return useQuery({
    queryKey: ['guest', id, 'history'],
    queryFn: () => apiClient.get(`/api/v1/guests/${id}/history`),
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/guests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  });
}
```

---

## TAREA 8: Tests

```typescript
// apps/api/src/modules/guests/guests.service.spec.ts
describe('GuestsService', () => {
  it('should create guest with allergies');
  it('should search guests by name');
  it('should filter by VIP tier');
  it('should auto-tag first visit guest');
  it('should calculate VIP tier correctly');
  it('should return guest history with orders');
  it('should NOT show guests from other tenant (isolation)');
});
```

**Verificación:** `npm run test` pasa conCoverage ≥ 80%

---

## TAREA 9: Componentes UI para Guest CRM

**Pantallas a construir:**
```
/guests                    → Lista con búsqueda y filtros
/guests/[id]               → Perfil completo + historial
/guests/new                → Formulario de creación
```

**Componentes en `/packages/ui`:**
- `GuestCard` — mini perfil para lista
- `GuestProfile` — perfil completo
- `GuestHistory` — timeline de visitas
- `GuestTags` — badges de tags
- `AllergyBadge` — alerta roja para allergies
- `VipBadge` — indicator gold para VIP

**Verificación:**
- Guest con allergies → badge rojo visible
- VIP guest → borde dorado en card

---

## ENTREGABLE

```
apps/api/src/modules/guests/
├── guests.controller.ts      ✅ CRUD endpoints
├── guests.service.ts          ✅ lógica + tagging
├── dto/
│   ├── create-guest.dto.ts
│   ├── update-guest.dto.ts
│   └── search-guest.dto.ts
├── services/
│   ├── tagging.service.ts     ✅ auto-tagging
│   └── tier-calculation.service.ts
└── guests.service.spec.ts     ✅ tests

apps/web/
├── hooks/useGuests.ts         ✅ hooks
├── pages/guests/
│   ├── index.tsx             ✅ lista
│   ├── [id].tsx              ✅ perfil
│   └── new.tsx               ✅ crear
└── components/guests/        ✅ componentes UI

packages/ui/src/components/
├── GuestCard/
├── GuestProfile/
└── AllergyBadge/
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → tests pasan
4. `pnpm build` → compila
5. API docs muestra todos los endpoints de guests en Swagger
6. Web: crear guest → persiste → aparece en lista
7. Auto-tagging se dispara correctamente post-order
8. Aislamiento de tenant verificado en tests

---

## PREGUNTA DE APROBACIÓN

El módulo Guest/CRM está completo con perfiles profundos, auto-tagging comportamental, VIP tiers, historial de visitas, y componentes UI listos.

**¿Avanzamos a la PROMPT-3 — Reservations & Floor Management?**