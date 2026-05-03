# PROMPT 0 — CONTRATO FUNDACIONAL

**Rol del agente:** Code Builder — Especializado en NestJS + React/Next.js + PostgreSQL/Prisma
**Tipo de proyecto:** SaaS multi-tenant para restaurantes de alta gama (fine dining)

---

## PRINCIPIO FUNDAMENTAL

RestaurantOS es un sistema operativo todo-en-uno para restaurantes de alta gama y fine dining. El proyecto debe eliminar la dependencia de múltiples herramientas desconectadas (CRM, POS, KDS, inventario) y reemplazarlas con un producto coherente donde cada módulo comparte la misma capa de datos.

**El diferenciador competitivo central:**
> "La cocina es parte del CRM" — Las banderas de alergias, estado VIP y notas de ocasión especial establecidas en la reserva aparecen automáticamente en los tickets de cocina. El frente y el fondo de la casa finalmente hablan el mismo idioma.

---

## OBJETIVO FINAL

Construir un sistema operativo de restaurante con 6 módulos integrados que comparten una única base de datos y bus de eventos en tiempo real:

1. **Guest Intelligence & CRM** — Perfiles profundos de invitados, auto-tagging comportamental, marketing automatizado, gestión de reputación
2. **Reservations & Floor Management** — Motor de reservas white-label, plano de piso en vivo, prevención de no-shows
3. **Kitchen Command System (KDS)** — Enrutamiento de órdenes por estación, tickets con prioridades visuales, controles de tiempo y curso
4. **Inventory & Procurement** — Inventario a nivel de ingrediente, costeo de recetas, alertas de bajo stock
5. **Staff & Service Operations** — Ordenes tableside, POS, procesamiento de pagos, gestión de personal
6. **Analytics & Admin Dashboard** — Dashboard en tiempo real, reportes de ventas y operaciones, analíticas de invitados

---

## STACK TECNOLÓGICO OBLIGATORIO

```
/apps/api          → NestJS (Node.js + TypeScript)
/apps/web          → Next.js 14 + React + TailwindCSS + TanStack Query
/apps/mobile       → React Native (iOS/Android) — Tableside ordering
/packages/ui       → Componentes compartidos (storybook)
/packages/config   → Turborepo pipelines, eslint, tsconfig

Base de datos:
  - PostgreSQL 16 (relacional: guests, orders, inventory, menu)
  - Redis (estado en tiempo real: cola KDS, estado de mesas)
  - Elasticsearch o PostgreSQL full-text search (búsqueda de invitados)

Colas:
  - Redis + BullMQ (jobs: emails marketing, alertas inventory, notificaciones)

Contenedores:
  - Docker + Docker Compose (desarrollo local)
  - Railway / AWS (producción)

Autenticación:
  - JWT + RBAC (Owner / Manager / Head Chef / Server / Host / Bartender)
  - Refresh token rotation
  - Rate limiting en login

Documentación API:
  - Swagger/OpenAPI (auto-generado desde decorators NestJS)

Testing:
  - Jest + Supertest (API)
  - Vitest + React Testing Library (web)
  - Detox o Appium (mobile)
```

---

## REGLAS ESTRUCTURALES INMUTABLES

### Monorepo con Turborepo

```
restaurant-os/
├── apps/
│   ├── api/                 # NestJS
│   │   ├── src/
│   │   │   ├── modules/     # Módulos por dominio
│   │   │   │   ├── auth/
│   │   │   │   ├── guests/
│   │   │   │   ├── reservations/
│   │   │   │   ├── orders/
│   │   │   │   ├── inventory/
│   │   │   │   ├── kitchen/
│   │   │   │   ├── payments/
│   │   │   │   └── analytics/
│   │   │   ├── common/      # Guards, decorators, filters, DTOs
│   │   │   ├── database/    # Prisma client, migrations
│   │   │   └── events/      # Event bus (BullMQ + Redis)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── test/
│   ├── web/                 # Next.js 14
│   │   ├── app/             # App Router
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/             # API client, WebSocket
│   └── mobile/              # React Native (Expo)
├── packages/
│   ├── ui/                  # Componentes compartidos
│   └── config/              # shared tsconfig, eslint
├── docker-compose.yml
├── turbo.json
└── package.json
```

### Estrategia Multi-Tenant (BLOQUEADA — sin excepciones)

```
┌─────────────────────────────────────────────────────────────┐
│  TENANT ISOLATION LAYER                                     │
│                                                             │
│  1. TODA query debe incluir: WHERE tenant_id = :tenantId   │
│  2. Middleware de tenant extrae tenant_id del JWT           │
│  3. Prisma middleware replica tenant_id en cada write       │
│  4. Tests incluyen tenant_id fixture en cada query         │
│  5. NUNCA cruzar datos entre tenants                        │
└─────────────────────────────────────────────────────────────┘
```

### Estrategia de fases inalterables

```
PROMPT-1  → Cimentación (monorepo, BD, auth multi-tenant, seeders)
PROMPT-2  → Módulo Guests/CRM
PROMPT-3  → Módulo Reservations & Floor
PROMPT-4  → Módulo Kitchen Command (KDS)
PROMPT-5  → Módulo Inventory & Procurement
PROMPT-6  → Módulo Staff Ops + POS
PROMPT-7  → Módulo Payments
PROMPT-8  → Módulo Analytics + Dashboard
PROMPT-9  → Marketing Automation + Notifications (BullMQ)
PROMPT-10 → Despliegue + Seguridad + Mobile准备
```

El archivo `PROMPT-X-REGLAS-TRANSVERSALES.md` contiene los estándares transversales que aplican a todas las fases.

---

## CICLO DE VERIFICACIÓN POR FASE

Cada fase sigue este ciclo:

1. `lint` → `tsc --noEmit` (type check)
2. Tests: `npm run test` (覆盖率 ≥ 80% en lógica de dominio)
3. Compilación exitosa: `npm run build`
4. Smoke test de los endpoints nuevos
5. **Aprobación del usuario antes de avanzar a la siguiente fase**

---

## PRIMER MENSAJE ESPERADO DEL AGENTE

AI comienza cada fase con:

```
[BUILDER] Ejecutando PROMPT-X — [NOMBRE DE FASE]

Objetivo: [descripción corta]
Entregable: [archivos específicos a generar]

POA (Plan de Acción):
1. [Tarea específica]
2. [Tarea específica]
...

Verificaré al final:
- lint passes
- tests pass  
- build succeeds
- smoke test OK
```

---

## REFERENCIAS

- HANDOVER.md → Requirements completos en `docs/HANDOVER.md`
- PROMPT-X-REGLAS-TRANSVERSALES.md → Estándares de API, errores, seguridad
- MASTER PROMPT → Metodología de agentes múltiples

---

*Documento creado: RestaurantOS — Contrato Fundacional v1.0*
*Basado en: HANDOVER.md (RestaurantOS Full System Handover)*