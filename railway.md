# Railway CLI Deployment Guide

## One-time Setup

### 1. Login
```bash
railway login
```
Opens browser — authorize the GitHub app.

### 2. Link project to GitHub repo
```bash
railway init
# Choose "Deploy from GitHub"
# Select your repo: marvinmcv-svg/Resto-Bar-OS
```

### 3. Add PostgreSQL database
```bash
railway add --database
```
This creates a PostgreSQL instance and sets DATABASE_URL automatically.

### 4. Generate JWT secret
```bash
openssl rand -base64 32
```
Copy the output — you'll paste it as JWT_SECRET.

### 5. Set environment variables
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set JWT_SECRET=<paste-from-step-4>
railway variables set ALLOWED_ORIGINS=https://your-web-url.railway.app,http://localhost:3000
railway variables set API_BASE_URL=https://api.your-domain.com
railway variables set FRONTEND_URL=https://your-domain.com
```

### 6. Configure web service env vars
```bash
railway variables set NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com --service=web
```

### 7. Set root directories per service
```bash
railway service set api --rootDirectory apps/api
railway service set web --rootDirectory apps/web
```

### 8. Deploy
```bash
railway up
```

### 9. Run database migrations
```bash
railway run npx prisma db push
railway run npm run prisma:seed:all
```

### 10. Get the public URL
```bash
railway domain
```
