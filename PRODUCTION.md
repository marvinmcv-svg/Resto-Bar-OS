# Production Deployment Checklist — RestaurantOS

## Prerequisites
- [ ] Railway account (or Vercel / Render / VPS)
- [ ] PostgreSQL 15+ database
- [ ] Domain with DNS access (for subdomain routing)

---

## API Environment Variables (`apps/api/.env`)

> **Security note:** Do NOT put real values in `.env` files committed to source control. Use Railway's environment variable UI or a secrets manager.

| Variable | Example | Generate / Find |
|----------|---------|----------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/restauranos` | Railway PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Optional — only if using Redis caching |
| `JWT_SECRET` | `openssl rand -base64 32` | Generate strong random secret (min 256 bits) |
| `JWT_EXPIRES_IN` | `7d` | Leave default unless you need different session length |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Leave default |
| `PORT` | `3001` | Railway default; can be overridden |
| `NODE_ENV` | `production` | Set explicitly on Railway |
| `ALLOWED_ORIGINS` | `https://yourapp.com,https://www.yourapp.com` | Your deployed web app URLs |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe dashboard (optional — simulated by default) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe dashboard (optional) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe dashboard webhook endpoint (optional) |
| `APP_VERSION` | `1.0.0` | Optional label for your deploy |

### Generate JWT_SECRET locally

```bash
# macOS / Linux
openssl rand -base64 32

# Git Bash (Windows)
openssl rand -base64 32 | tr -d '\n'

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Web Environment Variables (`apps/web/.env.production`)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.yourapp.com` |
| `NEXT_PUBLIC_APP_URL` | `https://yourapp.com` |

---

## Railway Deployment Steps

### 1. Create Railway project

```bash
npm install -g railway
railway login
railway init
# Follow prompts to link to your GitHub repo
```

### 2. Add PostgreSQL database

```bash
railway add --database
```

Copy the connection string from the Railway output into your `DATABASE_URL` environment variable.

### 3. Deploy API

```bash
cd apps/api
railway up
```

In the Railway dashboard for your API service, set all variables from the table above.

### 4. Deploy Web

```bash
cd apps/web
railway up
```

In the Railway dashboard for your web service, set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_APP_URL`.

### 5. Configure domain

1. In Railway dashboard → your **web service** → Settings → Networking → Custom Domain
2. Add `yourapp.com` and `www.yourapp.com`
3. In your DNS provider add:

   ```
   A record:    yourapp.com    → <railway-ip>
   CNAME:       www.yourapp.com → yourapp.com
   ```

4. For the API subdomain, add a CNAME:

   ```
   CNAME:       api.yourapp.com → <your-railway-web-service>.up.railway.app
   ```

---

## Database Setup on Production

```bash
# Push Prisma schema to the live database
railway run npx prisma db push

# Load realistic seed data
railway run npm run prisma:seed:all
```

---

## Stripe Activation (Optional)

When ready for real payments:

1. Get API keys from [stripe.com/dashboard](https://dashboard.stripe.com/apikeys)
2. Set in Railway API service environment variables:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
3. In Stripe dashboard → Webhooks, add endpoint:
   ```
   https://api.yourapp.com/api/v1/payments/webhook
   ```
4. The system auto-switches from simulated to real Stripe when the secret key is present.

---

## Demo Credentials (after seeding)

| Restaurant | Email | Password | Role |
|------------|-------|----------|------|
| Luma | `owner@luma.com` | `LumaOwner123!` | OWNER |
| Luma | `manager@luma.com` | `LumaManager123!` | MANAGER |
| Luma | `headchef@luma.com` | `LumaChef123!` | HEAD_CHEF |
| Sakura | `owner@sakura.com` | `SakuraOwner123!` | OWNER |
| The Garden | `owner@the-garden.com` | `GardenOwner123!` | OWNER |

---

## Smoke Test After Deploy

```bash
# API health check
curl https://api.yourapp.com/api/v1/health

# Login with demo account
curl -X POST https://api.yourapp.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@luma.com","password":"LumaOwner123!"}'

# Public booking widget (should return floor/tables for Luma)
curl https://yourapp.com/reserve/luma
```

Expected responses:
- `/api/v1/health` → `200` with `{ "status": "ok", "database": "connected" }`
- `/api/v1/auth/login` → `200` with JWT token + user object
- `/reserve/luma` → `200` with floor layout JSON

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `500` on `/api/v1/health` | `DATABASE_URL` missing or wrong | Check connection string; run `prisma db push` |
| `401` on API calls | `JWT_SECRET` mismatch | Ensure same secret in Railway API env vars |
| `403` CORS error | `ALLOWED_ORIGINS` missing | Add your web app URL to `ALLOWED_ORIGINS` |
| Empty floor (no tables) | Seed not run | Run `railway run npm run prisma:seed:all` |
| Stripe always in "simulated" mode | `STRIPE_SECRET_KEY` not set | Set `sk_live_...` (not just publishable key) |
| Web shows 404 for API calls | `NEXT_PUBLIC_API_BASE_URL` wrong | Must point to Railway API URL, not `/api` path |

---

## Quick Reference: All Environment Variables

```
# API (apps/api/.env)
DATABASE_URL=postgresql://user:pass@host:5432/restauranos
REDIS_URL=redis://localhost:6379          # optional
JWT_SECRET=                            # openssl rand -base64 32
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
STRIPE_SECRET_KEY=sk_live_...          # optional
STRIPE_PUBLISHABLE_KEY=pk_live_...     # optional
STRIPE_WEBHOOK_SECRET=whsec_...        # optional
APP_VERSION=1.0.0

# Web (apps/web/.env.production)
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com
```