import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import type { AppRole } from '@/lib/types'
import { canSeeCompanyDashboard, isDeptGestor } from '@/lib/roles'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department_id')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'funcionario') as AppRole

  // Categorias do usuário para filtros
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)

  // Departamentos (para admin/owner)
  const { data: departments } = role !== 'funcionario'
    ? await supabase.from('departments').select('id, name').eq('status', 'ativo')
    : { data: [] }

  // Membros do time (para admin/owner)
  let teamMembers: any[] = []
  if (canSeeCompanyDashboard(role)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, department_id')
      .order('full_name')
    teamMembers = data ?? []
  } else if (isDeptGestor(role)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, department_id')
      .eq('department_id', profile?.department_id)
    teamMembers = data ?? []
  }

  return (
    <DashboardView
      userId={user.id}
      role={role}
      departmentId={profile?.department_id ?? null}
      categories={categories ?? []}
      departments={departments ?? []}
      teamMembers={teamMembers}
    />
  )
}
