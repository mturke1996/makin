import { auditLogsService } from './firebaseService';
import { useAuthStore } from '../stores/useAuthStore';
import type { AuditAction } from '../types';
import { inferAuditAction, inferAuditEntity } from '../core/audit/inferAuditAction';

export interface WriteAuditParams {
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  clientId?: string;
  summary: string;
  details?: string;
}

/** كتابة سجل تدقيق — لا ترمي خطأ (لا تعطل العملية الأساسية) */
export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
  try {
    const user = useAuthStore.getState().user;
    const summary = params.summary.trim();
    if (!summary) return;

    await auditLogsService.add({
      id: crypto.randomUUID(),
      action: params.action ?? inferAuditAction(summary),
      entity: params.entity ?? inferAuditEntity(summary),
      entityId: params.entityId,
      clientId: params.clientId,
      summary,
      details: params.details,
      userId: user?.id ?? '',
      userName: user?.displayName || user?.email || 'مستخدم',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[audit]', err);
  }
}
