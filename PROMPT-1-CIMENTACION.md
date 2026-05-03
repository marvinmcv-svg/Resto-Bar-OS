# PROMPT FASE 1 — CIMENTACIÓN

**Por qué es importante:** Sin cimientos sólidos, todo lo que construyas después se tambaleará. Esta fase establece el monorepo, la base de datos con schema multi-tenant, la autenticación JWT con roles, los seeders básicos, y Swagger. Es la plataforma sobre la cual construyes los 6 módulos.

---

## TAREA 1: Configurar estructura de monorepo con Turborepo

```bash
restaurant-os/
├── apps/
│   ├── api/          # NestJS
│   ├── web/          # Next.js 14
│   └── mobile/       # React Native
├── packages/
│   ├── ui/
│   └── config/
├── turbo.json
└── package.json
```

**Archivos a crear:**
- `package.json` (root): workspaces, scripts turbo
- `turbo.json`: pipeline config
- `apps/api/package.json`: NestJS deps
- `apps/web/package.json`: Next.js deps
- `packages/config/package.json`: shared configs

**Verificación:** `npm run build` en root debería compilar todos los paquetes.

---

## TAREA 2: Schema de PostgreSQL con Prisma (multi-tenant)

**Modelos fundamentales (fase 1):**

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   @default("starter")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  guests    Guest[]
  tables    Table[]
  menuItems MenuItem[]
  orders    Order[]
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role     @default(SERVER)
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orders       Order[]
  sessions     Session[]
}

enum Role {
  OWNER
  MANAGER
  HEAD_CHEF
  SERVER
  HOST
  BARTENDER
}

model Session {
  id           String   @id @default(uuid())
  userId      String
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

**Reglas multi-tenant:**
- Todo modelo DEBE tener `tenantId String`
- Todos los modelos de dominio (Guest, Table, Order, etc.) se agregarán en fases posteriores

**Verificación:**
- `npx prisma validate` pasa
- `npx prisma migrate status` muestra estado

---

## TAREA 3: Autenticación JWT con RBAC

**Endpoints de auth:**
```
POST /api/v1/auth/register     → crear cuenta (primer usuario = OWNER del tenant)
POST /api/v1/auth/login        → email + password → access_token (15min) + refresh_token (7d, HttpOnly cookie)
POST /api/v1/auth/refresh      → usar refresh_token → nuevo access_token + rotate refresh
POST /api/v1/auth/logout       → invalidar refresh_token
GET  /api/v1/auth/me           → datos del usuario actual
```

**Implementar:**
- `src/modules/auth/` (controller, service, dto, guard, strategy)
- `src/common/guards/roles.guard.ts` — verifica role del JWT
- `src/common/decorators/roles.decorator.ts` — @Roles('OWNER', 'MANAGER')

**Flujo JWT:**
1. Login exitoso → access_token en response body (15 min), refresh_token en HttpOnly cookie (7 días)
2. Refresh: refresh_token cookie enviado automáticamente → rota y genera nuevo par
3. Logout: marca session como invalidada en DB

**Verificación:**
- Login con credenciales válidas → 200 + tokens
- Login con credenciales inválidas → 401 (mensaje genérico: "invalid credentials")
- Acceso a endpoint protegido sin token → 401
- Acceso a endpoint OWNER solo con rol SERVER → 403
- Refresh token válido → nuevo access_token
- Refresh token expirado → 401

---

## TAREA 4: Seeder de datos iniciales

**Objetivo:** Al levantar el proyecto por primera vez, debe tener datos mínimos funcionales.

**Seeds requeridos:**
1. **1 Tenant de demo** ("Restaurante Demo", slug: `demo`)
2. **1 Usuario Owner** (admin@demo.com / Admin123!)
3. **3 Roles predefinidos** (Owner, Manager, Server) como enum
4. **Tablas de ejemplo** (para floor plan demo): Mesa 1-12

**Lógica:**
```typescript
// prisma/seed.ts
// Solo ejecutar si TENANT table está VACÍA
// Si ya existe data → no hacer nada (idempotente)
```

**Verificación:**
- `npm run seed` ejecuta sin errores
- DB tiene tenant, user, tables

---

## TAREA 5: Documentación Swagger/OpenAPI

**Configurar en main.ts:**
```typescript
// NestJS + @nestjs/swagger
const config = new DocumentBuilder()
  .setTitle('RestaurantOS API')
  .setDescription('API for RestaurantOS - Fine Dining CRM & Operating System')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

**Verificación:**
- GET `/api/docs` muestra Swagger UI
- Endpoints auth documentados con Bearer auth

---

## TAREA 6: Docker Compose para desarrollo local

```yaml
version: '3.8'
services:
  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/restaurant_os
      REDIS_URL: redis://cache:6379
      JWT_SECRET: local-dev-secret-change-in-production
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    depends_on:
      - api

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: restaurant_os
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Verificación:**
- `docker-compose up` levanta todos los servicios
- `docker-compose ps` muestra todos corriendo
- API responde en localhost:3001

---

## TAREA 7: Pipeline de CI (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
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
```

---

## ENTREGABLE

```
restaurant-os/
├── PROMPT-0-CONTRATO-FUNDACIONAL.md    ✅
├── PROMPT-X-REGLAS-TRANSVERSALES.md    ✅
├── PROMPT-1-CIMENTACION.md             ✅ (este archivo)
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/auth/           ✅ auth completo
│   │   │   ├── common/                 ✅ guards, decorators, filters
│   │   │   └── database/              ✅ prisma client
│   │   ├── prisma/
│   │   │   └── schema.prisma           ✅ models Tenant, User, Session
│   │   └── Dockerfile
│   ├── web/
│   │   └── Dockerfile
│   └── mobile/
├── packages/
│   ├── ui/
│   └── config/
├── turbo.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## VERIFICACIÓN

1. `pnpm lint` → 0 errors
2. `pnpm typecheck` → 0 errors
3. `pnpm test` → todos los tests pasan
4. `pnpm build` → compilación exitosa
5. `docker-compose up` → servicios corriendo
6. Swagger UI accesible en `http://localhost:3001/api/docs`
7. Login endpoint responde correctamente

---

## PREGUNTA DE APROBACIÓN

¿Estás satisfecho con la cimentación? El sistema tiene autenticación JWT funcional, multi-tenant verificado, Docker Compose para desarrollo local, y Swagger documentado.

**¿Avanzamos a la PROMPT-2 — Módulo Guests/CRM?**