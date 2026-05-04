# RestaurantOS — Secrets Setup

## One-time setup for deployment

### Step 1: Generate JWT_SECRET

On macOS/Linux/Windows Git Bash:
```bash
openssl rand -base64 32
```

On Windows PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### Step 2: Add to Railway (dashboard)

Go to your Railway project → API service → Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (from Railway PostgreSQL plugin — auto-set) |
| `JWT_SECRET` | <output from step 1> |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `ALLOWED_ORIGINS` | `https://yourapp.railway.app,http://localhost:3000` |
| `API_BASE_URL` | `https://your-api.railway.app` |

Web service variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-api.railway.app` |

### Step 3: Add GitHub Secrets (for CI/CD)

In GitHub → Settings → Secrets → Actions:

| Secret Name | Value |
|-------------|-------|
| `RAILWAY_API_TOKEN` | (from railway.app → Account → API Tokens) |
| `DATABASE_URL` | (same as above) |
| `JWT_SECRET` | (same as above) |
| `API_BASE_URL` | `https://your-api.railway.app` |

In GitHub → Settings → Variables → Actions:

| Variable Name | Value |
|--------------|-------|
| `RAILWAY_WEB_URL` | `https://your-web.railway.app` |

### Step 4: Generate Railway API Token

1. Go to [railway.app/account](https://railway.app/account)
2. Click "New Token" → give it a name (e.g., "GitHub Actions")
3. Copy the token
4. Add to GitHub → Settings → Secrets → Actions as `RAILWAY_API_TOKEN`

### All commands in one block

```bash
# Generate JWT_SECRET
openssl rand -base64 32
# Example output: 3k8F9b2Xw7QvL1nR4tP6mK8sD5eJ3hG1cA0fZ9xY2wV4uM1qN8pR6sT0jK3

# To test locally:
# Add to apps/api/.env:
# JWT_SECRET=3k8F9b2Xw7QvL1nR4tP6mK8sD5eJ3hG1cA0fZ9xY2wV4uM1qN8pR6sT0jK3
```
