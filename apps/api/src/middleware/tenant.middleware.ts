import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../database/prisma.service';

interface TenantCacheEntry {
  tenantId: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SKIP_PATHS = ['/health', '/api/v1/health', '/db'];
const RESERVED_SUBDOMAINS = ['www', 'api'];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private cache = new Map<string, TenantCacheEntry>();

  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const pathname = req.path;

    // Bypass health check paths entirely
    if (SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return next();
    }

    const host = req.headers.host ?? '';
    const subdomain = this.extractSubdomain(host);

    if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain)) {
      return next();
    }

    const tenantId = await this.resolveTenantId(subdomain);
    if (tenantId) {
      (req as any).tenantId = tenantId;
    }

    next();
  }

  private extractSubdomain(host: string): string | null {
    // Remove port if present
    const hostname = host.split(':')[0];
    // Expected format: subdomain.restauranos.com
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }

  private async resolveTenantId(slug: string): Promise<string | null> {
    const now = Date.now();

    // Return cached if still valid
    const cached = this.cache.get(slug);
    if (cached && cached.expiresAt > now) {
      return cached.tenantId;
    }

    // Lookup in DB
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (tenant) {
      this.cache.set(slug, { tenantId: tenant.id, expiresAt: now + CACHE_TTL_MS });
      return tenant.id;
    }

    return null;
  }
}
