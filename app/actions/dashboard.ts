'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole, TaskPriority } from '@/lib/types'
import { canSeeCompanyDashboard, isDeptGestor, isStaffRole } from '@/lib/roles'

type PeriodLevel = 'individual' | 'team' | 'company'

interface DashboardStats {
  total: number
  done_on_time: number
  done_late: number
  not_done: number
  execution_rate: number
  on_time_rate: number
  late_rate: number
  not_done_rate: number
}

interface DashboardTask {
  id: string
  title: string
  status: string
  due_date: string | null
  completed_at: string | null
  priority: TaskPriority | null
  category_id: string | null
  categories?: { name: string; color: string } | { name: string; color: string }[] | null
  user_id: string
  assigned_to: string | null
}

function pct(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil nao encontrado.' as const }
  return {
    userId: user.id,
    role: (profile.role ?? 'funcionario') as AppRole,
    departmentId: (profile.department_id as string | null) ?? null,
  }
}

function normalizeCategory(task: DashboardTask) {
  const category = Array.isArray(task.categories) ? task.categories[0] ?? null : task.categories ?? null
  return { ...task, categories: category }
}

export async function getDashboardData(input: {
  level: PeriodLevel
  start: string
  end: string
  categoryId?: string | null
  departmentIdFilter?: string | null
  userIdFilter?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const { userId, role, departmentId } = caller
  const { level, start, end } = input

  if (level === 'company' && !canSeeCompanyDashboard(role)) {
    return { error: 'Sem permissao para ver nivel empresa.' }
  }
  if (level === 'team' && role === 'funcionario') {
    return { error: 'Sem permissao para ver nivel time.' }
  }

  const wantUserId = input.userIdFilter?.trim() || null
  const wantDeptId = input.departmentIdFilter?.trim() || null
  const wantCategoryId = input.categoryId?.trim() || null

  const needsCrossUserAccess =
    (level !== 'individual') ||
    (wantUserId && wantUserId !== userId)

  const supabase = needsCrossUserAccess ? createAdminClient() : await createClient()

  // Resolve lista de usuários para filtros (team/company)
  let scopedUserIds: string[] | null = null
  if (level === 'individual') {
    const target = wantUserId && (role !== 'funcionario' || wantUserId === userId) ? wantUserId : userId
    scopedUserIds = [target]
  } else if (level === 'team') {
    const deptScope = isDeptGestor(role) ? departmentId : (wantDeptId || null)
    if (isDeptGestor(role)) {
      if (!deptScope) return { error: 'Gestor sem departamento vinculado.' }
    }
    const q = (supabase as any)
      .from('profiles')
      .select('id, department_id')
      .order('id')
    const { data: members } = deptScope
      ? await q.eq('department_id', deptScope)
      : await q
    const ids = (members ?? []).map((m: any) => String(m.id)).filter(Boolean)
    scopedUserIds = Array.from(new Set(ids))
  } else {
    // company (owner)
    if (wantDeptId) {
      const { data: members } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('department_id', wantDeptId)
      scopedUserIds = (members ?? []).map((m: any) => String(m.id)).filter(Boolean)
    } else {
      scopedUserIds = null // sem filtro de usuários (tudo)
    }
  }

  // Filtro explícito de colaborador deve sempre prevalecer sobre escopo amplo.
  if (wantUserId) {
    scopedUserIds = [wantUserId]
  }

  // Admin não pode ver usuários fora do seu departamento
  if (isDeptGestor(role) && wantUserId && wantUserId !== userId) {
    if (!departmentId) return { error: 'Gestor sem departamento vinculado.' }
    const { data: targetProfile } = await (supabase as any)
      .from('profiles')
      .select('department_id')
      .eq('id', wantUserId)
      .single()
    if (targetProfile?.department_id !== departmentId) {
      return { error: 'Sem permissao para acessar este usuario.' }
    }
  }

  let tasksQuery = (supabase as any)
    .from('tasks')
    .select('id, title, status, due_date, completed_at, priority, category_id, categories(name, color), user_id, assigned_to')
    .gte('due_date', start)
    .lte('due_date', end)

  if (wantCategoryId && wantCategoryId !== 'all') {
    tasksQuery = tasksQuery.eq('category_id', wantCategoryId)
  }

  if (scopedUserIds && scopedUserIds.length > 0) {
    const csv = scopedUserIds.map((id) => `"${id}"`).join(',')
    tasksQuery = tasksQuery.or(`user_id.in.(${csv}),assigned_to.in.(${csv})`)
  }

  const { data: rawTasks, error: tasksError } = await tasksQuery
  if (tasksError) return { error: tasksError.message }

  const tasksScopedByOwner: DashboardTask[] = (rawTasks ?? [])
    .map(normalizeCategory)
    .filter((task: DashboardTask) => {
      if (!scopedUserIds || scopedUserIds.length === 0) return true
      const ownerId = task.assigned_to ?? task.user_id
      return scopedUserIds.includes(ownerId)
    })
  const tasks: DashboardTask[] = tasksScopedByOwner
  const today = new Date().toISOString().split('T')[0]

  let done_on_time = 0
  let done_late = 0
  let not_done = 0

  for (const task of tasks) {
    const due = task.due_date || ''
    if (task.status === 'done') {
      const completedDate = task.completed_at?.split('T')[0]
      if (completedDate && completedDate <= due) done_on_time++
      else done_late++
    } else if (due && due < today) {
      not_done++
    }
  }

  const total = done_on_time + done_late + not_done
  const stats: DashboardStats = {
    total,
    done_on_time,
    done_late,
    not_done,
    execution_rate: pct(done_on_time + done_late, total),
    on_time_rate: pct(done_on_time, total),
    late_rate: pct(done_late, total),
    not_done_rate: pct(not_done, total),
  }

  // Dados do usuário selecionado (apenas quando explicitamente filtrado)
  let selectedUser: null | {
    id: string
    full_name: string | null
    role: AppRole
    department_id: string | null
    department_name: string | null
    email: string | null
  } = null

  if (wantUserId) {
    const admin = createAdminClient()
    const { data: prof } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id, departments(name)')
      .eq('id', wantUserId)
      .single()

    let email: string | null = null
    if (isStaffRole(role)) {
      const { data: authData } = await admin.auth.admin.getUserById(wantUserId)
      email = authData?.user?.email ?? null
    }

    selectedUser = prof ? {
      id: String(prof.id),
      full_name: (prof.full_name as string | null) ?? null,
      role: (prof.role as AppRole) ?? 'funcionario',
      department_id: (prof.department_id as string | null) ?? null,
      department_name: (Array.isArray((prof as any).departments) ? (prof as any).departments?.[0]?.name : (prof as any).departments?.name) ?? null,
      email,
    } : null
  }

  return { stats, tasks, selectedUser }
}

