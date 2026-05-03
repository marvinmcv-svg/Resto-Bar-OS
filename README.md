# RestaurantOS — Full System Handover

All-in-one restaurant CRM & Operating System for fine dining restaurants.

## Project Structure

```
restaurant-os/
├── PROMPT-0-CONTRATO-FUNDACIONAL.md      ← Fundacional, léalo primero
├── PROMPT-X-REGLAS-TRANSVERSALES.md       ← Reglas que aplican a todas las fases
├── PROMPT-1-CIMENTACION.md                ← Monorepo, BD, Auth, Docker
├── PROMPT-2-MODULO-GUESTS-CRM.md          ← Guest profiles, auto-tagging, VIP tiers
├── PROMPT-3-MODULO-RESERVATIONS-FLOOR.md  ← Reservas, floor plan, no-show prevention
├── PROMPT-4-MODULO-KITCHEN-KDS.md         ← Kitchen Display System, tickets, timing
├── PROMPT-5-MODULO-INVENTORY.md           ← Recipe costing, stock tracking, waste
├── PROMPT-6-MODULO-STAFF-OPS-POS.md       ← Tableside, POS, payments, scheduling
├── PROMPT-7-MODULO-ANALYTICS-DASHBOARD.md ← Real-time dashboard, reports
├── PROMPT-8-MODULO-MARKETING-AUTOMATION.md ← Email/SMS campaigns, triggers, reputation
├── PROMPT-9-MODULO-PAYMENTS-STRIPE-MULTI-LOCATION.md ← Stripe, multi-venue groups
├── PROMPT-10-DEPLOYMENT-SECURITY-MOBILE.md ← Production deploy, security, mobile prep
└── README.md                              ← Este archivo
```

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| API | NestJS + TypeScript |
| Web | Next.js 14 + React + TailwindCSS |
| Mobile | React Native (Expo) |
| Database | PostgreSQL 16 + Prisma |
| Real-time | Redis + BullMQ |
| Payments | Stripe |
| Monorepo | Turborepo |

## Módulos (6 módulos integrados)

1. **Guest Intelligence & CRM** — Perfiles profundos, auto-tagging comportamental, marketing
2. **Reservations & Floor Management** — White-label booking, floor plan en vivo, no-show prevention
3. **Kitchen Command System (KDS)** — Tickets por estación, allergies destacados, timing controls
4. **Inventory & Procurement** — Recipe costing, stock en tiempo real, alertas de reorder
5. **Staff & Service Operations** — Tableside ordering, POS, payment processing, scheduling
6. **Analytics & Admin Dashboard** — Dashboard en tiempo real, reportes, multi-location

## Cómo usar estos prompts

Cada prompt es **autocontenido y listo para copiar-pegar** en una nueva conversación con un agente de desarrollo.

**Orden de ejecución:**
1. `PROMPT-0-CONTRATO-FUNDACIONAL.md` — Entender el proyecto completo
2. `PROMPT-X-REGLAS-TRANSVERSALES.md` — Conocer las reglas de arquitectura
3. `PROMPT-1` → `PROMPT-10` — Ejecutar en orden, una fase a la vez

**Por fase:**
1. Copiar el contenido del archivo de la fase
2. Pegar en la conversación del agente
3. El agente ejecuta las tareas listadas
4. Verificar con los checks de verificación
5. Aprobar y continuar a la siguiente fase

## Quick Start (Development)

```bash
# Clone y entra al proyecto
cd restaurant-os

# Instala dependencias
pnpm install

# Levanta con Docker Compose
docker-compose up

# API en http://localhost:3001/api/docs
# Web en http://localhost:3000
```

## Documentación adicional

- `docs/HANDOVER.md` — Requirements originales del proyecto
- `docs/ARCHITECTURE.md` — Diagrama de arquitectura detallada
- `docs/DEPLOY.md` — Guía de deployment a producción

## Desarrollo

### Scripts

```bash
pnpm lint          # Lint + format check
pnpm typecheck     # TypeScript check
pnpm test          # Run tests
pnpm build         # Build all apps
pnpm dev           # Development mode
```

### Credentials iniciales (desarrollo)

```
Tenant: Demo Restaurant (slug: demo)
Email: admin@demo.com
Password: Admin123!
Role: OWNER
```

## Deployment

Ver `PROMPT-10-DEPLOYMENT-SECURITY-MOBILE.md` para guía completa de producción.

```bash
# Railway (recomendado)
railway up

# Docker standalone
docker-compose -f docker-compose.yml up -d
```

---

*RestaurantOS — "La cocina es parte del CRM"*