'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'

export interface AuditLogEntry {
  id: string
  user_id: string
  user_name: string | null
  user_role: string | null
  action: string
  entity: string
  entity_id: string | null
  details: Record<string, any>   // coluna real do banco — contém description + metadata
  created_at: string
  profile?: { full_name: string | null; role: string | null } | null
}

export async function getAuditLogs(options?: {
  limit?: number
  offset?: number
  action?: string
  userId?: string
  search?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as AppRole
  if (!['owner', 'admin', 'gestor'].includes(role)) {
    return { error: 'Sem permissao para acessar logs.' }
  }

  const admin = createAdminClient()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = (admin as any)
    .from('audit_logs')
    .select('id, user_id, user_name, user_role, action, entity, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filtrar por grupo de action (prefixo): 'ai', 'task', 'user', etc
  if (options?.action && options.action !== 'all') {
    query = query.like('action', `${options.action}.%`)
  }
  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }
  if (options?.search) {
    // Buscar dentro do JSONB details->description
    query = query.ilike('details->>description', `%${options.search}%`)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  // Buscar nomes dos users dos logs
  const userIds = [...new Set((data ?? []).map((l: any) => l.user_id as string))]
  let profilesMap: Record<string, { full_name: string | null; role: string | null }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await (admin as any)
      .from('profiles')
      .select('id, full_name, role')
      .in('id', userIds)

    for (const p of profiles ?? []) {
      profilesMap[p.id] = { full_name: p.full_name, role: p.role }
    }
  }

  const logs: AuditLogEntry[] = (data ?? []).map((l: any) => ({
    ...l,
    profile: profilesMap[l.user_id] ?? null,
  }))

  return { logs }
}
