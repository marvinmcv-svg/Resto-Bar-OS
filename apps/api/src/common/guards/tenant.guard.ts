import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Validates that when an x-tenant-id header is provided it matches
 * the tenantId encoded in the verified JWT. Prevents a user from one
 * tenant accidentally or maliciously reading another tenant's data by
 * supplying a different x-tenant-id header.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const jwtTenantId = req.user?.tenantId;
    const headerTenantId = req.headers['x-tenant-id'];

    if (jwtTenantId && headerTenantId && jwtTenantId !== headerTenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }

    return true;
  }
}
