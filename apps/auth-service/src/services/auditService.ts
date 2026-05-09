import { getDb, auditLogs } from "@dentaliq/db";
import { createId } from "@paralleldrive/cuid2";

export interface AuditLogInput {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export class AuditService {
  private db = getDb();

  async log(input: AuditLogInput) {
    try {
      await this.db.insert(auditLogs).values({
        id: createId(),
        tenantId: input.tenantId,
        userId: input.userId || null,
        service: "auth-service",
        action: input.action,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
    } catch (err) {
      // We don't want audit logging failures to crash the main request,
      // but we should log the error to the console.
      console.error("[AuditService] Failed to write audit log:", err);
    }
  }
}
