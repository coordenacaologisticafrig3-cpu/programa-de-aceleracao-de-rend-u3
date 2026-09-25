import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'
import { canSeeCompanyDashboard, isStaffRole } from '@/lib/roles'
import { AssignView } from '@/components/assign/assign-view'

export default async function AtribuirPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  const role = (myProfile?.role ?? 'funcionario') as AppRole
  if (!isStaffRole(role)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--color-text-primary)' }}>Acesso negado</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Somente gestor e master podem acessar Atribuir tarefas.</p>
        </div>
      </div>
    )
  }

  const usersQuery = canSeeCompanyDashboard(role)
    ? supabase.from('profiles').select('id, full_name, department_id').order('full_name')
    : supabase.from('profiles').select('id, full_name, department_id').eq('department_id', myProfile?.department_id).order('full_name')
  const { data: users } = await usersQuery

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('status', 'ativo')
    .order('name')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name')

  // Owner vê todas as tarefas atribuídas; Admin vê apenas do seu departamento
  let recentQuery = supabase
    .from('tasks')
    .select('id, title, description, due_date, due_time, priority, recurrence, recurrence_id, status, assigned_to, category_id')
    .not('assigned_to', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  // Se for admin, filtrar apenas tarefas de usuários do mesmo departamento
  if (role === 'gestor' && myProfile?.department_id) {
    const deptUserIds = (users ?? []).map((u: any) => u.id)
    if (deptUserIds.length > 0) {
      recentQuery = recentQuery.in('assigned_to', deptUserIds)
    }
  }

  const { data: recentRaw } = await recentQuery

  const nameMap = new Map((users ?? []).map((u: any) => [u.id, u.full_name || 'Sem nome']))
  const recentTasks = (recentRaw ?? []).map((t: any) => ({
    ...t,
    assignee_name: nameMap.get(t.assigned_to) || 'Sem nome',
  }))

  const deptMap = new Map((departments ?? []).map((d: any) => [d.id, d.name]))
  const usersWithDept = (users ?? []).map((u: any) => ({
    ...u,
    department_name: deptMap.get(u.department_id) || 'Sem departamento',
  }))

  return (
    <AssignView
      role={role}
      userId={user.id}
      defaultDepartmentId={myProfile?.department_id ?? null}
      users={usersWithDept}
      departments={(departments ?? []) as any}
      categories={(categories ?? []) as any}
      recentTasks={recentTasks as any}
    />
  )
}
