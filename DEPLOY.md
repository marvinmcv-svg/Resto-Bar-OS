# RestaurantOS — Deployment Guide

## Prerequisites

- **Railway account** with a project created
- **PostgreSQL database** (Railway provision or external)
- **Domain** (optional, for subdomain tenant routing)

---

## Step 1: Railway Deployment

### 1.1 Connect Repository

1. Go to [Railway](https://railway.app) → your project → **Settings → Git Sync**
2. Connect your GitHub repo and select the `main` branch

### 1.2 Provision Database

```powershell
# In Railway dashboard:
# 1. Add New Service → PostgreSQL
# 2. Copy the DATABASE_URL connection string
```

### 1.3 Add Environment Variables

In Railway → **Settings → Variables**, add:

| Variable | Example Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/restaurantos` | PostgreSQL connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key-min-32-chars` | JWT signing secret (min 32 chars) |
| `NODE_ENV` | `production` | Enforces production mode |
| `API_URL` | `https://api.yourdomain.com` | Public API base URL |
| `WEB_URL` | `https://yourdomain.com` | Public web base URL |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe secret key (optional) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook signing secret (optional) |

> **Security:** Never commit `.env` files. All secrets live in Railway's variable store only.

### 1.4 Set Service Name

In Railway → **Settings → General**, set `RAILWAY_SERVICE_NAME` to match your service (e.g., `restaurantos-api`).

---

## Step 2: Deploy via GitHub Actions (Recommended)

The `.github/workflows/deploy.yml` pipeline automatically deploys on every push to `main`.

**Required GitHub Secrets:**

```powershell
# GitHub repo → Settings → Secrets and variables → Actions
# Add these secrets:

RAILWAY_API_TOKEN=<your-railway-api-token>
# Get from: Railway → Account Settings → API Tokens

# Also set in Repository Variables (not Secrets, since they're not sensitive):
RAILWAY_SERVICE_NAME=<your-service-name>
```

---

## Step 3: DNS & Subdomain Routing

### 3.1 Configure Domains

In Railway → **Settings → Networking**:

| Subdomain | Points To | Purpose |
|---|---|---|
| `api.yourdomain.com` | API service | REST API |
| `luma.yourdomain.com` | Web service | Luma restaurant |
| `sakura.yourdomain.com` | Web service | Sakura restaurant |
| `garden.yourdomain.com` | Web service | The Garden restaurant |

### 3.2 Tenant Middleware

The `apps/api/src/middleware/tenant.middleware.ts` extracts subdomain from the `Host` header and injects `tenantId` into all requests. The three tenants map to subdomains as follows:

| Subdomain | Tenant |
|---|---|
| `luma.*` | Luma |
| `sakura.*` | Sakura |
| `garden.*` | The Garden |

---

## Step 4: Run Seed Data on Production

After first deployment, run the seed script to populate realistic demo data:

```powershell
# SSH into Railway container (via Railway CLI)
railway login
railway run --project <project-id> npx prisma db seed

# Or via one-off command:
railway run -- npx ts-node apps/api/prisma/seed.ts
```

**Seed data includes:**
- 3 restaurants (Luma, Sakura, The Garden)
- 40 guests
- 90 reservations
- 54 ingredients
- 34 menu items

---

## Step 5: Stripe Setup

### 5.1 Add Stripe Keys

Once you have Stripe keys from your Stripe Dashboard:

```powershell
# In Railway Variables:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5.2 Stripe Webhook Endpoint

In Stripe Dashboard → **Webhooks**, add endpoint:

```
https://api.yourdomain.com/payments/stripe/webhook
```

Events to listen for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## Environment Variables Reference

### API (apps/api/.env.example)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/restaurantos"

# Auth
JWT_SECRET="replace-with-a-secure-random-string-min-32-chars"
JWT_EXPIRES_IN="7d"

# App
NODE_ENV="production"
API_PORT=3001
API_URL="https://api.yourdomain.com"

# CORS
ALLOWED_ORIGINS="https://luma.yourdomain.com,https://sakura.yourdomain.com,https://garden.yourdomain.com"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (optional, for notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="your-smtp-password"
```

### Web (apps/web/.env.production.example)

```env
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_WEB_URL="https://yourdomain.com"
```

---

## Troubleshooting

### Build fails on Railway
Check that `npx prisma generate` runs successfully. If Prisma client generation fails, verify `DATABASE_URL` is set before the build command runs.

### Tenant middleware not routing correctly
Verify DNS records point to the correct Railway deployment. Test with:
```powershell
curl -H "Host: luma.yourdomain.com" https://api.yourdomain.com/health
```

### Stripe webhooks not working
Ensure your Stripe webhook endpoint is HTTPS and the `STRIPE_WEBHOOK_SECRET` matches exactly.