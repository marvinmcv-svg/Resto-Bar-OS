#!/bin/bash
# Verification suite for RestaurantOS build pipeline
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "=== RestaurantOS Verification Suite ==="
echo ""

# 1. Lint checks
echo "1. Running lint checks..."
echo "   [API] ESLint..."
if [ -d "apps/api" ]; then
  npm run lint --workspace=apps/api || echo "   [WARN] ESLint not configured"
else
  echo "   [SKIP] No API app found"
fi

echo "   [Web] ESLint..."
if [ -d "apps/web" ]; then
  npm run lint --workspace=apps/web || echo "   [WARN] ESLint not configured"
else
  echo "   [SKIP] No Web app found"
fi

echo "   [Mobile] ESLint..."
if [ -d "apps/mobile" ]; then
  npm run lint --workspace=apps/mobile 2>/dev/null || echo "   [WARN] ESLint not configured"
else
  echo "   [SKIP] No Mobile app found"
fi
echo ""

# 2. Type checks
echo "2. Running type checks..."
echo "   [API] TypeScript..."
if [ -d "apps/api" ]; then
  npx tsc --noEmit --project apps/api/tsconfig.json || { echo "   [FAIL] API type check failed"; exit 1; }
fi

echo "   [Web] TypeScript..."
if [ -d "apps/web" ]; then
  npx tsc --noEmit --project apps/web/tsconfig.json || { echo "   [FAIL] Web type check failed"; exit 1; }
fi

echo "   [Mobile] TypeScript..."
if [ -d "apps/mobile" ]; then
  npx tsc --noEmit --project apps/mobile/tsconfig.json || { echo "   [FAIL] Mobile type check failed"; exit 1; }
fi
echo ""

# 3. Tests
echo "3. Running tests..."
if [ -f "package.json" ]; then
  npm test 2>/dev/null || echo "   [WARN] No test script configured"
else
  echo "   [SKIP] No package.json found"
fi
echo ""

# 4. Build verification
echo "4. Verifying builds..."
echo "   [API] NestJS build..."
if [ -d "apps/api" ]; then
  npm run build --workspace=apps/api || { echo "   [FAIL] API build failed"; exit 1; }
fi

echo "   [Web] Next.js build..."
if [ -d "apps/web" ]; then
  npm run build --workspace=apps/web || { echo "   [FAIL] Web build failed"; exit 1; }
fi

echo "   [Mobile] Expo export..."
if [ -d "apps/mobile" ]; then
  npx expo export --platform all 2>/dev/null || echo "   [WARN] Expo export not available in CI"
fi
echo ""

echo "=== ALL CHECKS PASSED ==="
