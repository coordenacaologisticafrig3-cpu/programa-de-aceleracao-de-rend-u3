import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'
import { canSeeCompanyDashboard, isStaffRole } from '@/lib/roles'
import { TeamView } from '@/components/team/team-view'

function toDateOnly(value?: string | null) {
  if (!value) return null
  return value.split('T')[0]
}

export default async function EquipePage() {
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
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Somente gestor e master podem acessar Time/Equipe.</p>
        </div>
      </div>
    )
  }

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('status', 'ativo')
    .order('name')

  const profilesQuery = canSeeCompanyDashboard(role)
    ? supabase.from('profiles').select('id, full_name, department_id').order('full_name')
    : supabase.from('profiles').select('id, full_name, department_id').eq('department_id', myProfile?.department_id).order('full_name')

  const { data: collaborators } = await profilesQuery
  const userIds = (collaborators ?? []).map((p: any) => p.id)
  const idsCsv = userIds.map((id: string) => `"${id}"`).join(',')

  const { data: tasks } = userIds.length
    ? await supabase
      .from('tasks')
      .select('id, user_id, assigned_to, status, due_date, completed_at, department_id')
      .or(`user_id.in.(${idsCsv}),assigned_to.in.(${idsCsv})`)
    : { data: [] }

  const today = new Date().toISOString().split('T')[0]
  const deptMap = new Map((departments ?? []).map((d: any) => [d.id, d.name]))

  const memberStats = (collaborators ?? []).map((profile: any) => {
    const owned = (tasks ?? []).filter((t: any) => ((t.assigned_to as string | null) ?? t.user_id) === profile.id)
    let pending = 0
    let overdue = 0
    let doneOnTime = 0
    let doneLate = 0

    for (const task of owned) {
      const dueDate = task.due_date as string
      if (task.status === 'done') {
        const completedDate = toDateOnly(task.completed_at)
        if (completedDate && completedDate <= dueDate) doneOnTime++
        else doneLate++
      } else if (task.status !== 'done' && dueDate < today) {
        overdue++
      } else {
        pending++
      }
    }

    const done = doneOnTime + doneLate
    const total = pending + overdue + done
    const executionRate = total > 0 ? Math.round((done / total) * 100) : 0

    return {
      userId: profile.id,
      name: profile.full_name || 'Sem nome',
      departmentId: profile.department_id,
      departmentName: deptMap.get(profile.department_id) || 'Sem departamento',
      pending,
      overdue,
      doneOnTime,
      doneLate,
      executionRate,
    }
  })

  const byDepartment = new Map<string, { pending: number; overdue: number; done: number }>()
  for (const item of memberStats) {
    const key = item.departmentId || 'none'
    const prev = byDepartment.get(key) || { pending: 0, overdue: 0, done: 0 }
    prev.pending += item.pending
    prev.overdue += item.overdue
    prev.done += item.doneOnTime + item.doneLate
    byDepartment.set(key, prev)
  }

  const departmentComparisons = Array.from(byDepartment.entries()).map(([departmentId, v]) => {
    const total = v.pending + v.overdue + v.done
    return {
      departmentId,
      departmentName: deptMap.get(departmentId) || 'Sem departamento',
      pending: v.pending,
      overdue: v.overdue,
      done: v.done,
      executionRate: total > 0 ? Math.round((v.done / total) * 100) : 0,
    }
  })

  const companyPending = memberStats.reduce((acc, item) => acc + item.pending, 0)
  const companyOverdue = memberStats.reduce((acc, item) => acc + item.overdue, 0)

  return (
    <TeamView
      role={role}
      departments={(departments ?? []) as any}
      members={memberStats}
      departmentComparisons={departmentComparisons}
      companyPending={companyPending}
      companyOverdue={companyOverdue}
    />
  )
}
