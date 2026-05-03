# Findings — RestaurantOS

## Architecture Decisions

1. **Monorepo structure** — Turborepo for CI/cache optimization
2. **Multi-tenant isolation** — Prisma middleware mandatory enforcement
3. **JWT + refresh tokens** — 15min access, 7-day refresh, rotation
4. **Real-time** — WebSocket on same port as Express, Redis pub/sub for cross-service
5. **Dark luxury theme** — Charcoal (#0a0a0a) + gold (#c9a962), Cormorant Garamond + DM Sans fonts
6. **Offline-first KDS** — Service Worker + IndexedDB for ticket persistence

## Key Models (Phase 1)

```
Tenant (id, name, slug, plan)
  └── User (id, email, passwordHash, role, tenantId)
  └── Session (id, userId, refreshToken, expiresAt)

All domain models extend tenantId:
  Guest, Reservation, Table, Order, OrderItem, MenuItem, Recipe, etc.
```

## RBAC Roles

| Role | Permissions |
|------|-------------|
| OWNER | All |
| MANAGER | read/write/orders/inventory/staff/reports |
| HEAD_CHEF | read/write/menu/inventory |
| SERVER | orders:read, orders:write, tables:read |
| HOST | reservations:read/write, tables:write |
| BARTENDER | orders:read/write, tables:read |

## Verified Patterns

- class-validator DTOs with ApiProperty decorators
- Exception filter for consistent error response format
- Prisma $use middleware for tenant_id auto-replication
- BullMQ for background jobs (emails, alerts, reminders)
- Redis SET for fast table/KDS status, PUBLISH for broadcasts

## Pending Decisions

- Exact storage engine for sessions (Redis vs DB)
- File storage for guest photos (S3? local?)
- SMS provider choice (Twilio confirmed for Phase 8)
- Email provider choice (SendGrid confirmed for Phase 8)