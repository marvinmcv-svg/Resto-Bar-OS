# RestaurantOS — Project Facts

**Type:** SaaS multi-tenant for fine dining restaurants
**Stack:** NestJS + Next.js 14 + PostgreSQL + Redis + BullMQ + Turborepo
**Modules:** 6 integrated (Guest CRM, Reservations, KDS, Inventory, Staff Ops, Analytics)
**Phases:** 10 (PROMPT-1 through PROMPT-10)
**Current:** PROMPT-0 approved, starting PROMPT-1

## Key Decisions

- Monorepo with Turborepo: `/apps/api`, `/apps/web`, `/apps/mobile`, `/packages/ui`, `/packages/config`
- Multi-tenant mandatory with Prisma middleware enforcement
- JWT + RBAC: Owner/Manager/HeadChef/Server/Host/Bartender
- Dark luxury theme: charcoal/black backgrounds, gold accents
- Real-time via WebSocket + Redis pub/sub
- Payments: Stripe (Phase 9)

## Documentation

- HANDOVER.md → full requirements (in `docs/`)
- PROMPT-0 through PROMPT-10 → modular development prompts (in root)
- README.md → project overview