# Task Plan — RestaurantOS

## Current Phase: PROMPT-1 (Cimentación)

**Goal:** Establish monorepo, PostgreSQL with Prisma, JWT multi-tenant auth, seeders, Swagger, Docker Compose

---

## Phase Checklist

### PROMPT-1: Cimentación
- [ ] Configure Turborepo monorepo structure
- [ ] Setup NestJS API in /apps/api
- [ ] Setup Next.js web in /apps/web
- [ ] Create Prisma schema with Tenant/User/Session models
- [ ] Implement JWT auth with RBAC guards
- [ ] Create seeders (demo tenant, admin user, sample tables)
- [ ] Configure Swagger/OpenAPI docs
- [ ] Create Docker Compose for local dev
- [ ] Setup GitHub Actions CI pipeline
- [ ] Verify: lint, typecheck, tests, build, docker

### PROMPT-2: Guest/CRM Module
- [ ] Prisma models (Guest, Tags, VIP tiers)
- [ ] CRUD endpoints with search
- [ ] Auto-tagging engine
- [ ] VIP tier calculation service
- [ ] Guest history endpoint
- [ ] Web hooks and components
- [ ] Tests (≥80% coverage)

### PROMPT-3: Reservations & Floor
- [ ] Prisma models (Reservation, Table)
- [ ] CRUD endpoints for reservations
- [ ] Floor plan endpoints (table status)
- [ ] Table optimization engine
- [ ] No-show prevention (BullMQ jobs)
- [ ] White-label booking API
- [ ] Web floor plan UI
- [ ] Tests

### PROMPT-4: Kitchen Command (KDS)
- [ ] Prisma models (Order, OrderItem, MenuItem, Recipe)
- [ ] Order creation endpoint
- [ ] Inventory deduction trigger
- [ ] KDS ticket engine (group by station)
- [ ] Station endpoints
- [ ] Expo/Pass view
- [ ] Course/timing controls
- [ ] 86 broadcast
- [ ] Offline reliability
- [ ] WebSocket events
- [ ] KDS UI screens
- [ ] Tests

### PROMPT-5: Inventory & Procurement
- [ ] Prisma models (Ingredient, Supplier, WasteLog)
- [ ] Recipe costing engine
- [ ] Inventory tracking endpoints
- [ ] Low-stock alert system
- [ ] Menu engineering report
- [ ] Waste variance tracking
- [ ] Purchase order generation
- [ ] Web UI
- [ ] Tests

### PROMPT-6: Staff Ops + POS
- [ ] Tableside ordering (mobile)
- [ ] POS terminal (web)
- [ ] Bill splitting service
- [ ] Payment processing (simulated)
- [ ] Tip management
- [ ] Staff scheduling
- [ ] Time clock
- [ ] Staff performance metrics
- [ ] User management (RBAC)
- [ ] Training mode
- [ ] Tests

### PROMPT-7: Analytics + Dashboard
- [ ] Real-time dashboard
- [ ] Sales reports
- [ ] Operational reports
- [ ] Guest analytics
- [ ] Menu performance
- [ ] Multi-location support
- [ ] Export to CSV/PDF
- [ ] Tests

### PROMPT-8: Marketing Automation
- [ ] Email campaign models
- [ ] Email templates
- [ ] Campaign builder
- [ ] Trigger engine
- [ ] BullMQ queue setup
- [ ] Notification center
- [ ] Reputation management
- [ ] Tests

### PROMPT-9: Payments (Stripe) + Multi-location
- [ ] Stripe integration
- [ ] Payment intents
- [ ] Webhook handler
- [ ] Deposit for reservations
- [ ] Split payments
- [ ] Tips with Stripe
- [ ] Multi-location models
- [ ] Cross-location queries
- [ ] Tests

### PROMPT-10: Deployment + Security + Mobile
- [ ] Security hardening (helmet, CORS, rate limiting)
- [ ] Environment variables & secrets
- [ ] Dockerfile production
- [ ] Docker Compose production
- [ ] Railway deployment
- [ ] Health check endpoint
- [ ] PII encryption (GDPR)
- [ ] OWASP security scan
- [ ] Mobile Expo setup
- [ ] CI/CD pipeline
- [ ] Final verification suite