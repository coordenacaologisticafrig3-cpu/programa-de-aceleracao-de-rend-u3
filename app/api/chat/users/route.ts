import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStaffRole } from '@/lib/roles'
import type { AppRole } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isStaffRole((profile?.role ?? 'funcionario') as AppRole)) {
    return Response.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, role, department_id')
    .order('full_name')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    users: (data ?? []).map((u: any) => ({
      id: String(u.id),
      name: (u.full_name as string | null) || 'Sem nome',
      role: (u.role as string | null) ?? null,
      departmentId: (u.department_id as string | null) ?? null,
    })),
  })
}
