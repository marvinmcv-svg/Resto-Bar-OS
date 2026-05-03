# PROMPT-X — REGLAS TRANSVERSALES

**Aplican a TODAS las fases (PROMPT-1 → PROMPT-10)**

---

## 1. ESTÁNDAR DE API

### Formato de respuesta consistente

```typescript
// Éxito
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-05-02T12:00:00.000Z",
    "version": "v1"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción legible",
    "field": "email"
  }
}
```

### DTOs con class-validator

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuestDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '+1 555-1234' })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

### Versionado de API

- Todas las rutas: `/api/v1/*`
- Cuando cambia el contrato: `/api/v2/*`
- Mantener v1 disponible mínimo 6 meses

### Versioning Strategy

| Strategy | Pros | Cons |
|---|---|---|
| URL path `/api/v1/*` | Clear, testable | Code duplication |
| Query param `?api_version=2` | One endpoint | Easy to miss |
| Header `Accept-Version` | Clean | Client must know |

**Usar URL versioning** — `/api/v1/guests`, `/api/v2/guests`

---

## 2. MANEJO DE ERRORES

### Exception Filter (NestJS)

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const body = exception.getResponse() as any;

    response.status(status).json({
      success: false,
      error: {
        code: body.message || 'INTERNAL_ERROR',
        message: Array.isArray(body.message) ? body.message[0] : body.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### Logging con Pino

```typescript
// Estructura: timestamp, tenant_id, endpoint, method, statusCode, duration
{
  "level": "info",
  "time": "2025-05-02T12:00:00.000Z",
  "tenantId": "tenant_abc123",
  "method": "POST",
  "endpoint": "/api/v1/guests",
  "statusCode": 201,
  "duration": 45,
  "userId": "user_xyz"
}
```

**Regla:** Nunca exponer errores internos (stack traces) en producción. Loguear internamente, responder con mensaje genérico.

### HTTP Status Codes

| Code | Use |
|------|-----|
| 200 | GET, PUT exitoso |
| 201 | POST creado |
| 204 | DELETE exitoso (sin body) |
| 400 | Input inválido |
| 401 | No autenticado |
| 403 | Autenticado pero sin permiso |
| 404 | Recurso no existe |
| 409 | Conflicto (ej: email duplicado) |
| 422 | Validación falló |
| 500 | Error interno |

---

## 3. SISTEMA DE DISEÑO (UI)

### Componentes compartidos en `/packages/ui`

```
packages/
└── ui/
    ├── src/
    │   ├── components/
    │   │   ├── Button/
    │   │   ├── Input/
    │   │   ├── Card/
    │   │   ├── Modal/
    │   │   ├── Table/
    │   │   ├── Badge/
    │   │   └── ...
    │   └── index.ts
    └── package.json
```

### Paleta de diseño (luxury dark theme)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;      /* Deep black */
  --bg-secondary: #141414;   /* Charcoal */
  --bg-elevated: #1a1a1a;   /* Card surfaces */
  --bg-overlay: rgba(0,0,0,0.8);

  /* Accents */
  --accent-gold: #c9a962;    /* Gold primary */
  --accent-gold-light: #e5c98a;
  --accent-gold-muted: #8a7340;

  /* Text */
  --text-primary: #f5f5f5;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;

  /* Status */
  --status-success: #4ade80;
  --status-warning: #fbbf24;
  --status-error: #f87171;
  --status-info: #60a5fa;

  /* KDS Priority Colors */
  --kds-green: #22c55e;      /* Within time */
  --kds-amber: #f59e0b;      /* Approaching limit */
  --kds-red: #ef4444;        /* Overdue */
}
```

### Tipografía

```css
/* Headings: Cormorant Garamond or Playfair Display */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap');

/* UI: DM Sans or Outfit */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

.font-display {
  font-family: 'Cormorant Garamond', serif;
}

.font-ui {
  font-family: 'DM Sans', sans-serif;
}
```

### Responsive Breakpoints

```css
/* Mobile first */
--screen-sm: 640px;
--screen-md: 768px;
--screen-lg: 1024px;
--screen-xl: 1280px;
--screen-2xl: 1536px;
```

---

## 4. GESTIÓN DE ESTADO FRONTEND

### TanStack Query (React)

```typescript
// hooks/useGuests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useGuests(tenantId: string) {
  return useQuery({
    queryKey: ['guests', tenantId],
    queryFn: () => apiClient.get(`/api/v1/guests?tenantId=${tenantId}`),
    enabled: !!tenantId,
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGuestDto) => apiClient.post('/api/v1/guests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
  });
}
```

### Reglas

- **NO estado global innecesario** — usar TanStack Query para server state
- **NO Prop drilling** — usar React Context solo para Auth y Theme
- **WebSocket state** — en componente local, no en store global

---

## 5. SEGURIDAD ADICIONAL

### JWT + Refresh Token Rotation

```typescript
// Auth flow
1. Login → access_token (15 min) + refresh_token (7 days) cookie (HttpOnly, Secure, SameSite=Lax)
2. access_token expira → usar refresh_token → nuevo access_token
3. Refresh token rotation: cada refresh genera nuevo refresh_token (viejo invalidado)
4. Logout → invalidate refresh_token en DB
```

### Rate Limiting en Login

```typescript
// guards/rate-limit.guard.ts
// 5 intentos por minuto por IP
// 3 intentos fallidos → lockout 15 minutos
// Implementar con @nestjs/throttler
```

### Validación de inputs

```typescript
// regla: nunca confiar en input del cliente
@Post('/guests')
async create(@Body() dto: CreateGuestDto) {
  // class-validator ya valida antes de llegar aquí
}
```

### Headers de seguridad

```typescript
// main.ts
app.use(helmet());
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
});
```

---

## 6. COMUNICACIÓN CON EL USUARIO

### Analogías para conceptos técnicos

| Concepto | Analogía |
|----------|-----------|
| Multi-tenant | "Cada restaurante tiene su propio espacio privado de datos" |
| Event bus | "Cuando alguien pide un plato, un messenger corre a avisar a cocina, inventario y CRM al mismo tiempo" |
| JWT | "Una tarjeta de acceso con fecha de caducidad" |
| Prisma | "Traductor entre código y base de datos" |
| BullMQ | "Cola de trabajos en segundo plano" |

### Puntos de decisión

- Antes de implementar algo no definido → preguntar
- Si hay ambigüedad → proponer y confirmar
- Si se detecta vacío funcional → sugerir y pedir confirmación

### Formato de respuestas

- Explicar en español simple
- Usar analogías cuando sea útil
- Mostrar avances con checkmarks
- Terminar con pregunta de aprobación

---

## 7. MULTI-TENANT ENFORCEMENT

### Prisma Middleware para tenant_id

```typescript
// database/prisma.ts
prisma.$use(async (params, next) => {
  if (params.model && tenantAwareModels.includes(params.model)) {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where.tenantId = getCurrentTenantId();
    }
    if (params.action === 'findMany' || params.action === 'create') {
      if (!params.args.where) params.args.where = {};
      params.args.where.tenantId = getCurrentTenantId();
    }
    if (params.action === 'create') {
      if (!params.args.data) params.args.data = {};
      params.args.data.tenantId = getCurrentTenantId();
    }
  }
  return next(params);
});
```

### Modelos que requieren tenant_id

```prisma
// Todos estos modelos DEBEN tener tenantId String
Guest, Reservation, Table, Order, OrderItem, MenuItem, Ingredient, Recipe, Staff, Payment
```

### Tests de aislamiento

```typescript
it('should NOT see tenant B data', async () => {
  const guestA = await createGuest({ tenantId: 'A' });
  const guestB = await createGuest({ tenantId: 'B' });

  const result = await api.get('/guests', { headers: { 'x-tenant-id': 'A' } });

  expect(result.data).toContainEqual(expect.objectContaining({ id: guestA.id }));
  expect(result.data).NOT.toContainEqual(expect.objectContaining({ id: guestB.id }));
});
```

---

## 8. REAL-TIME (WebSocket)

### Event Bus Architecture

```typescript
// events/event-bus.ts
interface DomainEvent {
  type: string;
  tenantId: string;
  payload: any;
  timestamp: Date;
}

// order.placed → KDS consumer, Inventory consumer, CRM consumer
// ticket.bumped → Expo consumer
// inventory.low → Alert consumer
```

### Redis Pub/Sub para eventos cross-service

```typescript
// publishers
await redis.publish('order.placed', JSON.stringify(event));

// subscribers
const subscriber = redis.duplicate();
await subscriber.subscribe('order.placed');
subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  // process
});
```

---

*Archivo: PROMPT-X-REGLAS-TRANSVERSALES.md*
*Aplica a: Todas las fases PROMPT-1 → PROMPT-10*