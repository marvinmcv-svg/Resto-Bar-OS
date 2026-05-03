# PROMPT FASE 10 — DEPLOYMENT + SECURITY + MOBILE PREP

**Por qué es importante:** El sistema está construido. Esta fase lo pone en producción de forma segura, documenta el deployment, y prepara el camino para el app nativo mobile. Es la última fase — el sistema sale al mundo.

---

## TAREA 1: Security Hardening

```typescript
// 1. Helmet.js (HTTP headers de seguridad)

import helmet from 'helmet';

// En main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**2. CORS configurado**
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
});
```

**3. Rate Limiting**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

app.use(
  throttler({
    ttl: 60000,
    limit: 100,
  })
);

// Más estricto en auth endpoints
@UseGuards(ThrottlerGuard)
@Post('auth/login')
async login() { ... }
```

**4. Input sanitization**
```typescript
// class-validator ya valida inputs
// Agregar: sanitize con class-transformer

import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;
}
```

**5. SQL Injection prevention**
```typescript
// Prisma ya previene SQL injection por default
// Regla: nunca usar raw strings en where clauses
// BAD: `where: { id: userInput }` // si userInput viene directo
// GOOD: `where: { id: sanitizeInput(userInput) }`
```

**Verificación:**
- `npm run lint` → 0 issues
- Security headers presentes en responses
- Rate limiting activo

---

## TAREA 2: Environment Variables & Secrets

```bash
# .env.example (committed, no real values)

# App
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/restaurant_os

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-256-bits
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (Phase 9)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@restaurantos.com

# SMS (Phase 9)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Admin
ADMIN_EMAIL=admin@restaurantos.com
ADMIN_PASSWORD_HASH= (pre-computed, never here)
```

**Secrets que NO deben estar en código:**
- JWT_SECRET
- STRIPE_SECRET_KEY
- Database password

**Regla:** Todos los secrets en environment, nunca hardcoded

**Verificación:**
- API boots sin DATABASE_URL → error claro
- Missing JWT_SECRET →拒绝启动

---

## TAREA 3: Dockerfile Producción (API)

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
```

**Multi-stage build:**
- Builder stage: compila TypeScript
- Production stage: solo lo necesario

**Non-root user:**
- Security: container no corre como root

**Verificación:**
- Docker build exitoso
- Image size < 200MB
- Container corre como non-root

---

## TAREA 4: Docker Compose Producción

```yaml
# docker-compose.yml (producción)
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
      NODE_ENV: production
    depends_on:
      - api

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: restaurant_os
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

**Verificación:**
- `docker-compose up` → todos los servicios corriendo
- Health checks pasando
- Web accessible en port 3000

---

## TAREA 5: Railway Deployment Config

```toml
# railway.toml (en root)
[build]
builder = "dockerfile"
dockerfile = "apps/api/Dockerfile"

[deploy]
healthcheckPath = "/api/v1/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[variables]
NODE_ENV = "production"
```

**Railway CLI:**
```bash
# Deploy
railway up

# Verify
railway status
railway logs --tail 50

# Variables (set in dashboard)
# DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, etc.
```

**Verificación:**
- `railway up` → successful deployment
- Health check passing
- App responds in <2s

---

## TAREA 6: PostgreSQL Migrations in Production

```bash
# script: deploy-migrate.sh
#!/bin/bash
set -e

echo "Running migrations..."
npx prisma migrate deploy

echo "Generating client..."
npx prisma generate

echo "Seeding if needed..."
node dist/prisma/seed.js

echo "Deployment ready"
```

**Reglas:**
- `prisma migrate deploy` (NO `dev` ni `reset` en producción)
- Siempre backup antes de migrar
- Migration debe ser idempotent

**Verificación:**
- Migration corre sin errores
- DB schema matches Prisma schema

---

## TAREA 7: Health Check Endpoint

```typescript
// src/health.controller.ts

@Get()
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  @Get('db')
  async checkDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (e) {
      throw new InternalServerErrorException('Database connection failed');
    }
  }

  @Get('redis')
  async checkRedis() {
    try {
      await this.redis.ping();
      return { status: 'ok', redis: 'connected' };
    } catch (e) {
      throw new InternalServerErrorException('Redis connection failed');
    }
  }
}
```

**Uso:**
- Railway healthcheck: `/api/v1/health`
- Load balancer: verificar que API está up
- Monitoring: alert si health fail

**Verificación:**
- `GET /api/v1/health` → 200 con status
- `GET /api/v1/health/db` → verifica DB connection

---

## TAREA 8: PII Encryption (GDPR Compliance)

```typescript
// pipes/encrypt.pipe.ts
// Encriptar PII antes de guardar

import { encrypt, decrypt } from './crypto';

export function encryptPii<T>(data: T): T {
  // Encriptar campos sensibles: email, phone, staffNotes
  // Solo si Tenant tiene GDPR enabled
}

// Middleware para audit trail
// Cada access a guest data → log en audit_events

model AuditEvent {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  userId    String
  action    String   // "read", "update", "delete"
  resource  String   // "guest", "payment"
  resourceId String
  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())
}
```

**Regla GDPR:**
- Guest puede solicitar export de sus datos
- Guest puede solicitar deletion ("right to be forgotten")
- Datos de pago: guardar solo último 4 digits, no full card

**Verificación:**
- PII fields encrypted at rest
- Audit log captures access
- Delete request elimina guest data

---

## TAREA 9: OWASP ZAP Security Scan (CI)

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ZAP scan
        uses: zaproxy/action-api-scan@v0.7.0
        with:
          target: 'https://staging.restaurantos.com/api/v1'
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: results.sarif
```

**Scans:**
- OWASP Top 10 vulnerabilities
- SQL injection
- XSS
- Authentication bypass

**Verificación:**
- Scan corre en CI
- 0 HIGH/CRITICAL issues antes de deploy

---

## TAREA 10: Mobile Prep (React Native / Expo)

```bash
# apps/mobile/

# Estructura preparada para Expo
npx create-expo-app mobile --template blank-typescript

# Dependencies
npx expo install @tanstack/react-query
npx expo install react-native-ble
npx expo install expo-secure-store
npx expo install expo-constants

# Para KDS screens
npx expo install react-native-webview
npx expo install react-native-svg
```

**Config:**
```typescript
// apps/mobile/app.json
{
  "expo": {
    "name": "RestaurantOS",
    "slug": "restaurant-os",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "extra": {
      apiUrl: process.env.EXPO_PUBLIC_API_URL
    }
  }
}
```

**Pantallas Phase 1-6 ya diseñadas (tableside, kitchen):**
```typescript
// apps/mobile/src/screens/
// - TableOrderScreen.tsx (completado en Phase 6)
// - KitchenDisplayScreen.tsx (KDS)
// - LoginScreen.tsx
```

**Verificación:**
- `npx expo start` → Expo dev tools launch
- iOS build succeeds: `npx expo run:ios --no-build`
- Android build succeeds: `npx expo run:android --no-build`

---

## TAREA 11: CI/CD Pipeline Final

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: numeral/docker-compose-action@v1
        with:
          compose-file: 'docker-compose.yml'
      - run: docker-compose up -d
      - run: docker-compose exec api npm run migrate
      - run: docker-compose exec api npm run seed
```

**Reglas:**
- Todo test debe pasar antes de deploy
- Solo main branch hace deploy automáticamente
- Staging environment para testing

**Verificación:**
- Push a main → deploy automático
- Rollback si health check fail

---

## TAREA 12: README Final

```markdown
# RestaurantOS

All-in-one restaurant operating system for fine dining.

## Quick Start

```bash
# Development
docker-compose up
open http://localhost:3000

# Production
railway up
```

## Stack

- **API:** NestJS + PostgreSQL + Redis
- **Web:** Next.js 14 + TailwindCSS
- **Mobile:** React Native (Expo)
- **Payments:** Stripe

## Modules

1. Guest CRM
2. Reservations & Floor
3. Kitchen Command (KDS)
4. Inventory
5. Staff Ops + POS
6. Payments
7. Analytics
8. Marketing Automation

## Documentation

- [API Docs](http://localhost:3001/api/docs)
- [HANDOVER.md](docs/HANDOVER.md)
- [Architecture](docs/ARCHITECTURE.md)

## Deployment

See [DEPLOY.md](docs/DEPLOY.md)
```

**Verificación:** README.md existe y es completo

---

## TAREA 13: Final Verification Suite

```bash
#!/bin/bash
# verify-build.sh

echo "=== Running verification suite ==="

echo "1. Lint..."
pnpm lint || exit 1

echo "2. Type check..."
pnpm typecheck || exit 1

echo "3. Tests..."
pnpm test || exit 1

echo "4. Build..."
pnpm build || exit 1

echo "5. Docker build..."
docker build -t restaurant-os:prod ./apps/api || exit 1

echo "6. Docker compose..."
docker-compose up -d
sleep 10
docker-compose ps || exit 1

echo "7. Health check..."
curl -f http://localhost:3001/api/v1/health || exit 1

echo "=== ALL CHECKS PASSED ==="
```

**Verificación:** `bash verify-build.sh` → todos los pasos pasan

---

## ENTREGABLE

```
restaurant-os/
├── PROMPT-0-CONTRATO-FUNDACIONAL.md    ✅
├── PROMPT-X-REGLAS-TRANSVERSALES.md    ✅
├── PROMPT-1-CIMENTACION.md             ✅
├── PROMPT-2-MODULO-GUESTS-CRM.md       ✅
├── PROMPT-3-MODULO-RESERVATIONS-FLOOR.md ✅
├── PROMPT-4-MODULO-KITCHEN-KDS.md      ✅
├── PROMPT-5-MODULO-INVENTORY.md        ✅
├── PROMPT-6-MODULO-STAFF-OPS-POS.md    ✅
├── PROMPT-7-MODULO-ANALYTICS-DASHBOARD.md ✅
├── PROMPT-8-MODULO-MARKETING-AUTOMATION.md ✅
├── PROMPT-9-MODULO-PAYMENTS-STRIPE-MULTI-LOCATION.md ✅
├── PROMPT-10-DEPLOYMENT-SECURITY-MOBILE.md ✅ (este archivo)
├── README.md                           ✅
├── docker-compose.yml                  ✅ (producción)
├── apps/api/
│   ├── Dockerfile                      ✅
│   └── src/
│       └── health.controller.ts        ✅
└── docs/
    └── DEPLOY.md                       ✅
```

---

## VERIFICACIÓN FINAL

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → todos pasan
4. `pnpm build` → compilación exitosa
5. Docker image built successfully
6. Health endpoint responds
7. Security headers present
8. Rate limiting active
9. PII encryption configured
10. OWASP scan in CI
11. Mobile Expo project builds
12. CI/CD pipeline working

---

## PREGUNTA DE APROBACIÓN FINAL

Deployment + Security + Mobile Prep completo. El sistema está listo para producción con:
- Docker + Railway deployment
- Security hardening (helmet, CORS, rate limiting, PII encryption)
- OWASP security scan en CI
- Mobile (Expo) project scaffolded
- Health checks y monitoring
- CI/CD completo

**RestaurantOS está completo. ¿Alguna revisión adicional antes de cerrar?**