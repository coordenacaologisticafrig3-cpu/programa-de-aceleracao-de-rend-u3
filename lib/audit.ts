'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  // Tarefas
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.completed'
  | 'task.assigned'
  | 'task.recurring_deleted'
  | 'task.all_deleted'
  // Usuarios
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.signed_in'
  | 'user.signed_out'
  // Departamentos
  | 'department.created'
  | 'department.updated'
  | 'department.deleted'
  | 'department.user_assigned'
  // Categorias
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  // Integracoes
  | 'integration.connected'
  | 'integration.disconnected'
  // IA
  | 'ai.task_created'
  | 'ai.task_updated'
  | 'ai.task_completed'
  | 'ai.task_deleted'
  | 'ai.user_created'
  | 'ai.user_updated'
  | 'ai.user_deleted'
  | 'ai.department_created'
  | 'ai.category_created'
  | 'ai.report_requested'
  | 'ai.message'
  // Recorrencias
  | 'recurrence.created'
  | 'recurrence.deleted'

export interface AuditLogPayload {
  userId: string
  userName?: string
  userRole?: string
  action: AuditAction
  entity?: string        // ex: 'task', 'user', 'department'
  entityId?: string      // UUID da entidade afetada
  description: string    // Descricao humana legivel (salva em details.description)
  metadata?: Record<string, any> // Dados extras (titulo da task, email do user, etc)
}

export async function logAudit(payload: AuditLogPayload): Promise<void> {
  try {
    const admin = createAdminClient()

    // Mapear entity para o grupo correto — coluna entity é NOT NULL no banco
    const entityValue = payload.entity ?? inferEntityFromAction(payload.action)

    const { error } = await admin.from('audit_logs').insert({
      user_id:   payload.userId,
      user_name: payload.userName ?? null,
      user_role: payload.userRole ?? null,
      action:    payload.action,
      entity:    entityValue,
      entity_id: payload.entityId ?? null,
      // Tudo em details: compatível com a coluna JSONB existente
      details: {
        description: payload.description,
        ...(payload.metadata ?? {}),
      },
    })

    if (error) {
      console.error('[audit] Insert error:', error.message, error.details)
    }
  } catch (err) {
    // Nunca deixar erro de log quebrar o fluxo principal
    console.error('[audit] Failed to log:', err)
  }
}

function inferEntityFromAction(action: string): string {
  const prefix = action.split('.')[0]
  const map: Record<string, string> = {
    task:        'task',
    user:        'user',
    department:  'department',
    category:    'category',
    integration: 'integration',
    ai:          'ai',
    recurrence:  'recurrence',
  }
  return map[prefix] ?? 'system'
}
