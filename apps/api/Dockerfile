FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install deps and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
