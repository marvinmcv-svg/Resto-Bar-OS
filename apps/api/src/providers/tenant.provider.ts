import { Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private tenantId: string | null = null;

  setFromRequest(req: Request): void {
    this.tenantId = (req as any).tenantId ?? null;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }
}
