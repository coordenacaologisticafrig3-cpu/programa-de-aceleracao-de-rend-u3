'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'
import { canPickAnyDepartment, isDeptGestor, isStaffRole } from '@/lib/roles'

const FULL_CHAT_CONTROL = true

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' as const }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id, full_name')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Perfil não encontrado.' as const }
  return {
    supabase,
    userId: user.id,
    role: (FULL_CHAT_CONTROL ? 'owner' : profile.role) as AppRole,
    departmentId: profile.department_id as string | null,
    fullName: profile.full_name as string | null,
  }
}

// ── Relatório geral do projeto ─────────────────────────────────────────────

export async function getProjectReport(input: {
  start: string
  end: string
  departmentId?: string | null
  userId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  let usersQuery = (admin as any).from('profiles').select('id, full_name, role, department_id')
  if (isDeptGestor(role) && departmentId) {
    usersQuery = usersQuery.eq('department_id', departmentId)
  } else if (input.departmentId) {
    usersQuery = usersQuery.eq('department_id', input.departmentId)
  }
  if (input.userId) {
    usersQuery = usersQuery.eq('id', input.userId)
  }
  const { data: profiles } = await usersQuery
  const userIds = (profiles ?? []).map((p: any) => p.id as string)

  let tasksQuery = (admin as any)
    .from('tasks')
    .select('id, title, status, due_date, completed_at, priority, user_id, assigned_to')
    .gte('due_date', input.start)
    .lte('due_date', input.end)

  if (input.userId) {
    tasksQuery = tasksQuery.or(`user_id.eq.${input.userId},assigned_to.eq.${input.userId}`)
  } else if (userIds.length > 0) {
    const csv = userIds.map((id: string) => `"${id}"`).join(',')
    tasksQuery = tasksQuery.or(`user_id.in.(${csv}),assigned_to.in.(${csv})`)
  }

  const { data: tasks, error } = await tasksQuery
  if (error) return { error: error.message }

  const allTasks = tasks ?? []
  let done_on_time = 0, done_late = 0, not_done = 0, pending = 0

  for (const t of allTasks) {
    const due = t.due_date || ''
    if (t.status === 'done') {
      const completedDate = (t.completed_at as string | null)?.split('T')[0]
      if (completedDate && completedDate <= due) done_on_time++
      else done_late++
    } else if (due && due < today) {
      not_done++
    } else {
      pending++
    }
  }

  const total = done_on_time + done_late + not_done
  const execRate = total > 0 ? Math.round(((done_on_time + done_late) / total) * 100) : 0
  const onTimeRate = total > 0 ? Math.round((done_on_time / total) * 100) : 0

  // Breakdown por usuário
  const byUser: Record<string, { name: string; done: number; late: number; pending: number; not_done: number }> = {}
  for (const p of (profiles ?? [])) {
    byUser[p.id] = { name: p.full_name || 'Sem nome', done: 0, late: 0, pending: 0, not_done: 0 }
  }
  for (const t of allTasks) {
    const uid = (t.assigned_to as string | null) || (t.user_id as string)
    if (!byUser[uid]) continue
    const due = t.due_date || ''
    if (t.status === 'done') {
      const completedDate = (t.completed_at as string | null)?.split('T')[0]
      if (completedDate && completedDate <= due) byUser[uid].done++
      else byUser[uid].late++
    } else if (due && due < today) {
      byUser[uid].not_done++
    } else {
      byUser[uid].pending++
    }
  }

  return {
    period: { start: input.start, end: input.end },
    total_tasks: allTasks.length,
    done_on_time,
    done_late,
    not_done,
    pending,
    execution_rate: execRate,
    on_time_rate: onTimeRate,
    by_user: Object.values(byUser),
  }
}

// ── Listar usuários do time ────────────────────────────────────────────────

export async function listTeamMembers(input: { departmentId?: string | null } = {}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  // Busca perfis sem join — join de departments causa 400 em alguns schemas
  let q = (admin as any).from('profiles').select('id, full_name, role, department_id')

  if (isDeptGestor(role)) {
    if (departmentId) q = q.eq('department_id', departmentId)
  } else if (input.departmentId) {
    q = q.eq('department_id', input.departmentId)
  }

  const { data, error } = await q.order('full_name')
  if (error) return { error: error.message }

  // Busca nomes dos departamentos separadamente
  const deptIds = [...new Set((data ?? []).map((p: any) => p.department_id).filter(Boolean))]
  let deptMap: Record<string, string> = {}
  if (deptIds.length > 0) {
    const { data: depts } = await (admin as any)
      .from('departments')
      .select('id, name')
      .in('id', deptIds)
    for (const d of (depts ?? [])) deptMap[d.id] = d.name
  }

  return {
    members: (data ?? []).map((p: any) => ({
      id: p.id as string,
      name: (p.full_name as string | null) || 'Sem nome',
      role: p.role as AppRole,
      department: deptMap[p.department_id] ?? null,
    })),
  }
}

// ── Listar departamentos ───────────────────────────────────────────────────

export async function listDepartments() {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('departments')
    .select('id, name, status, profiles(id, full_name, role)')
    .eq('status', 'ativo')
    .order('name')

  if (error) return { error: error.message }

  return {
    departments: (data ?? []).map((d: any) => ({
      id: d.id as string,
      name: d.name as string,
      member_count: Array.isArray(d.profiles) ? d.profiles.length : 0,
    })),
  }
}

// ── Consultar tarefas ──────────────────────────────────────────────────────

export async function queryTasks(input: {
  userId?: string | null
  departmentId?: string | null
  status?: string | null
  priority?: string | null
  start?: string | null
  end?: string | null
  limit?: number
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId, userId: callerId } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  let q = (admin as any)
    .from('tasks')
    .select('id, title, status, priority, due_date, due_time, recurrence, assigned_to, user_id')
    .order('due_date', { ascending: true })
    .limit(input.limit ?? 50)

  // Filtro por usuário ou departamento
  if (input.userId) {
    q = q.or(`user_id.eq.${input.userId},assigned_to.eq.${input.userId}`)
  } else if (isDeptGestor(role) && departmentId) {
    const { data: members } = await (admin as any).from('profiles').select('id').eq('department_id', departmentId)
    const ids = (members ?? []).map((m: any) => `"${m.id}"`).join(',')
    if (ids) q = q.or(`user_id.in.(${ids}),assigned_to.in.(${ids})`)
  } else if (input.departmentId) {
    const { data: members } = await (admin as any).from('profiles').select('id').eq('department_id', input.departmentId)
    const ids = (members ?? []).map((m: any) => `"${m.id}"`).join(',')
    if (ids) q = q.or(`user_id.in.(${ids}),assigned_to.in.(${ids})`)
  }

  // Filtro de status e datas
  if (input.status === 'overdue') {
    // Tarefas atrasadas: pending com vencimento <= hoje
    q = q.eq('status', 'pending').lte('due_date', today)
  } else {
    if (input.status) q = q.eq('status', input.status)
    if (input.start) q = q.gte('due_date', input.start)
    if (input.end) q = q.lte('due_date', input.end)
  }

  if (input.priority) q = q.eq('priority', input.priority)

  const { data, error } = await q
  if (error) {
    console.log('[v0] queryTasks error:', error.message)
    return { error: error.message }
  }

  // Buscar nomes dos usuários atribuídos separadamente
  const assignedIds = [...new Set((data ?? []).map((t: any) => t.assigned_to).filter(Boolean))]
  let userMap: Record<string, string> = {}
  if (assignedIds.length > 0) {
    const { data: profiles } = await (admin as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', assignedIds)
    for (const p of (profiles ?? [])) userMap[p.id] = p.full_name || 'Sem nome'
  }

  return {
    tasks: (data ?? []).map((t: any) => ({
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      priority: t.priority as string | null,
      due_date: t.due_date as string | null,
      recurrence: t.recurrence as string | null,
      assigned_to_name: userMap[t.assigned_to] ?? 'Não atribuído',
    })),
    total: (data ?? []).length,
    today,
  }
}

// ── Criar tarefas em lote ─────────────────────────────────────────────────

export async function createBatchTasks(input: {
  tasks: Array<{
    title: string
    description?: string
    dueDate: string
    dueTime?: string
    priority: 'baixa' | 'normal' | 'alta' | 'urgente'
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
    categoryId?: string | null
  }>
  assigneeIds: string[]
  departmentId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId, userId } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão para atribuir tarefas.' }
  if (!input.tasks.length) return { error: 'Nenhuma tarefa fornecida.' }
  if (!input.assigneeIds.length) return { error: 'Nenhum usuário selecionado.' }

  const admin = createAdminClient()

  // Validar assignees
  let allowedIds = input.assigneeIds
  if (isDeptGestor(role) && departmentId) {
    const { data: team } = await (admin as any)
      .from('profiles')
      .select('id')
      .eq('department_id', departmentId)
      .in('id', input.assigneeIds)
    allowedIds = (team ?? []).map((p: any) => p.id as string)
    if (!allowedIds.length) return { error: 'Nenhum colaborador válido no seu departamento.' }
  }

  const rows: any[] = []
  for (const task of input.tasks) {
    for (const assigneeId of allowedIds) {
      rows.push({
        title: task.title.trim(),
        description: task.description?.trim() || null,
        user_id: userId,
        assigned_to: assigneeId,
        assigned_by_user_id: userId,
        department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
        category_id: task.categoryId || null,
        due_date: task.dueDate,
        due_time: task.dueTime || null,
        priority: task.priority,
        recurrence: task.recurrence,
        status: 'pending',
      })
    }
  }

  const { data, error } = await (admin as any).from('tasks').insert(rows).select('id, title, assigned_to, due_date, priority')
  if (error) return { error: error.message }

  return {
    created: (data ?? []).length,
    tasks: data ?? [],
  }
}

// ── Criar tarefa recorrente ───────────────────────────────────────────────

export async function createRecurringTask(input: {
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  startDate: string
  endDate?: string | null
  time?: string | null
  priority: 'baixa' | 'normal' | 'alta' | 'urgente'
  daysOfWeek?: number[]
  dayOfMonth?: string
  intervalDays?: number
  departmentId?: string | null
  assigneeIds?: string[]
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId, userId } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const normalizedDaysOfWeek = input.daysOfWeek && input.daysOfWeek.length > 0 ? input.daysOfWeek : [1, 2, 3, 4, 5]
  const normalizedDayOfMonth = input.dayOfMonth || '1'
  const normalizedIntervalDays = input.intervalDays && input.intervalDays > 0 ? input.intervalDays : 1

  // user_id da recorrência = o primeiro assignee (para ele ver na página /recorrencia)
  // Se não houver assignees, usa o chamador (criação própria via IA)
  const recurrenceUserId = (input.assigneeIds && input.assigneeIds.length > 0)
    ? input.assigneeIds[0]
    : userId

  // Criar entrada na tabela recurrences
  const { data: recurrenceData, error: recurrenceError } = await (admin as any)
    .from('recurrences')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      frequency: input.frequency,
      start_date: input.startDate,
      end_date: input.endDate || null,
      time: input.time || null,
      priority: input.priority,
      days_of_week: input.frequency === 'weekly' ? normalizedDaysOfWeek : [],
      day_of_month: input.frequency === 'monthly' ? normalizedDayOfMonth : null,
      interval_days: input.frequency === 'daily' ? 1 : (input.frequency === 'custom' ? normalizedIntervalDays : null),
      user_id: recurrenceUserId,
      department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
      is_active: true,
    })
    .select()
    .single()

  if (recurrenceError) return { error: recurrenceError.message }

  // Se houver assigneeIds, gerar instâncias diárias de tarefas
  let generatedTasks = []
  if (input.assigneeIds && input.assigneeIds.length > 0 && input.frequency === 'daily') {
    const startDate = new Date(input.startDate)
    const endDate = input.endDate ? new Date(input.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Padrão: segunda a sexta (1-5)
    const daysOfWeek = input.daysOfWeek ?? [1, 2, 3, 4, 5]

    let taskInstances: any[] = []

    // Para cada assignee, gerar instâncias para cada dia útil
    for (const assigneeId of input.assigneeIds) {
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()

        if (daysOfWeek.includes(dayOfWeek)) {
          taskInstances.push({
            title: input.title.trim(),
            description: input.description?.trim() || null,
            user_id: assigneeId,          // dono = o assignee, para ele ver na recorrencia
            assigned_to: assigneeId,
            assigned_by_user_id: userId,
            department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
            due_date: currentDate.toISOString().split('T')[0],
            due_time: input.time || null,
            priority: input.priority,
            recurrence: 'none',
            recurrence_id: recurrenceData.id,  // vincular à recorrência pai
            status: 'pending',
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // Inserir instâncias
    if (taskInstances.length > 0) {
      const { data: tasksData, error: tasksError } = await (admin as any)
        .from('tasks')
        .insert(taskInstances)
        .select('id, title, due_date, assigned_to, status')

      if (tasksError) {
        console.log('[v0] Erro ao criar instâncias de tarefas:', tasksError.message)
        return { recurrence: recurrenceData, error: `Recorrência criada mas instâncias falharam: ${tasksError.message}` }
      }

      generatedTasks = tasksData ?? []
    }
  }

  return {
    recurrence: recurrenceData,
    generatedTasks,
    message: input.assigneeIds && input.frequency === 'daily'
      ? `Tarefa recorrente criada com ${generatedTasks.length} instâncias diárias (${input.assigneeIds.length} colaboradores).`
      : 'Tarefa recorrente criada (configurada como padrão, sem instâncias automáticas).',
  }
}

// ── Criar checklist recorrente diário para um usuário ───────────────────────

export async function createDailyRecurringChecklist(input: {
  assigneeId: string
  tasks: string[]
  startDate?: string | null
  endDate?: string | null
  time?: string | null
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente'
  departmentId?: string | null
}) {
  const today = new Date().toISOString().split('T')[0]
  const cleanedTasks = (input.tasks || [])
    .map((task) => task.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)

  if (!cleanedTasks.length) {
    return { error: 'Nenhuma tarefa válida foi fornecida para o checklist diário.' }
  }

  const created: Array<{ title: string; recurrenceId?: string; generatedCount?: number; error?: string }> = []

  for (const title of cleanedTasks) {
    const result = await createRecurringTask({
      title,
      description: '',
      frequency: 'daily',
      startDate: input.startDate || today,
      endDate: input.endDate || null,
      time: input.time || null,
      priority: input.priority || 'normal',
      departmentId: input.departmentId || null,
      assigneeIds: [input.assigneeId],
    })

    if ('error' in result && result.error) {
      created.push({ title, error: result.error })
      continue
    }

    created.push({
      title,
      recurrenceId: (result as any).recurrence?.id,
      generatedCount: Array.isArray((result as any).generatedTasks) ? (result as any).generatedTasks.length : 0,
    })
  }

  const success = created.filter((item) => !item.error)
  const failed = created.filter((item) => item.error)

  return {
    ok: failed.length === 0,
    total: created.length,
    success: success.length,
    failed: failed.length,
    items: created,
    message:
      failed.length === 0
        ? `Checklist diário recorrente criado com sucesso: ${success.length} tarefa(s).`
        : `Checklist criado parcialmente: ${success.length} sucesso(s), ${failed.length} falha(s).`,
  }
}

// ── Verificar permissão de acesso ao chat ─────────────────────────────────

export async function checkChatAccess() {
  const caller = await getCaller()
  if ('error' in caller) return { allowed: false, error: caller.error }
  const { role, fullName } = caller
  return { allowed: true, role, fullName }
}

// ══════════════════════════════════════════════════════════════════════════
// GESTÃO COMPLETA DO SISTEMA
// ══════════════════════════════════════════════════════════════════════════

// ── GESTÃO DE USUÁRIOS ────────────────────────────────────────────────────

export async function createUser(input: {
  email: string
  fullName: string
  role: 'funcionario' | 'gestor' | 'admin'
  departmentId?: string | null
  password?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId: callerDeptId } = caller

  if (!isStaffRole(role)) {
    return { error: 'Sem permissão para criar usuários.' }
  }

  const admin = createAdminClient()

  // Criar usuário na auth com senha (se fornecida) ou sem (link de confirmação)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    password: input.password ?? undefined,
    user_metadata: {
      full_name: input.fullName,
    },
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Erro ao criar usuário na autenticação.' }
  }

  // Determinar departamento final
  let finalDeptId = input.departmentId
  if (isDeptGestor(role)) {
    finalDeptId = callerDeptId // Gestor só pode criar no seu departamento
  }

  // Atualizar profile
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: input.fullName,
      role: input.role,
      department_id: finalDeptId || null,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    return { error: `Usuário criado mas erro ao atualizar perfil: ${profileError.message}` }
  }

  return {
    user: {
      id: authData.user.id,
      email: authData.user.email,
      fullName: input.fullName,
      role: input.role,
      departmentId: finalDeptId,
    },
    message: `Usuário ${input.fullName} (${input.email}) criado com sucesso.`,
  }
}

export async function updateUser(input: {
  userId: string
  fullName?: string
  role?: 'funcionario' | 'gestor' | 'admin'
  departmentId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId: callerDeptId } = caller

  if (!isStaffRole(role)) {
    return { error: 'Sem permissão para editar usuários.' }
  }

  const admin = createAdminClient()

  // Verificar se o usuário existe
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, full_name, role, department_id')
    .eq('id', input.userId)
    .single()

  if (!existingProfile) {
    return { error: 'Usuário não encontrado.' }
  }

  // Gestor só pode editar usuários do seu departamento
  if (isDeptGestor(role) && existingProfile.department_id !== callerDeptId) {
    return { error: 'Você só pode editar usuários do seu departamento.' }
  }

  const updates: any = {}
  if (input.fullName) updates.full_name = input.fullName
  if (input.role) updates.role = input.role
  if (input.departmentId !== undefined) {
    if (isDeptGestor(role)) {
      updates.department_id = callerDeptId // Gestor não pode mudar departamento
    } else {
      updates.department_id = input.departmentId
    }
  }

  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', input.userId)

  if (error) return { error: error.message }

  return { message: 'Usuário atualizado com sucesso.', userId: input.userId }
}

export async function deleteUser(userId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller

  if (role !== 'owner') {
    return { error: 'Apenas owners podem deletar usuários.' }
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  return { message: 'Usuário deletado com sucesso.' }
}

// ── GESTÃO DE DEPARTAMENTOS ───────────────────────────────────────────────

export async function createDepartment(input: {
  name: string
  managerId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller

  if (role !== 'owner') {
    return { error: 'Apenas owners podem criar departamentos.' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('departments')
    .insert({
      name: input.name,
      manager_id: input.managerId || null,
      status: 'ativo',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  return {
    department: data,
    message: `Departamento "${input.name}" criado com sucesso.`,
  }
}

export async function updateDepartment(input: {
  departmentId: string
  name?: string
  managerId?: string | null
  status?: 'ativo' | 'inativo'
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller

  if (role !== 'owner') {
    return { error: 'Apenas owners podem editar departamentos.' }
  }

  const admin = createAdminClient()

  const updates: any = {}
  if (input.name) updates.name = input.name
  if (input.managerId !== undefined) updates.manager_id = input.managerId
  if (input.status) updates.status = input.status

  const { error } = await admin
    .from('departments')
    .update(updates)
    .eq('id', input.departmentId)

  if (error) return { error: error.message }

  return { message: 'Departamento atualizado com sucesso.' }
}

export async function deleteDepartment(departmentId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller

  if (role !== 'owner') {
    return { error: 'Apenas owners podem deletar departamentos.' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('departments')
    .delete()
    .eq('id', departmentId)

  if (error) return { error: error.message }

  return { message: 'Departamento deletado com sucesso.' }
}

// ── GESTÃO DE CATEGORIAS ──────────────────────────────────────────────────

export async function getCategories() {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('categories')
    .select('id, name, color, icon')
    .order('name')

  if (error) return { error: error.message }

  return { categories: data || [] }
}

export async function createCategory(input: {
  name: string
  color: string
  icon?: string
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('categories')
    .insert({
      name: input.name,
      color: input.color,
      icon: input.icon || null,
      user_id: caller.userId,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  return {
    category: data,
    message: `Categoria "${input.name}" criada com sucesso.`,
  }
}

export async function updateCategory(input: {
  categoryId: string
  name?: string
  color?: string
  icon?: string
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const updates: any = {}
  if (input.name) updates.name = input.name
  if (input.color) updates.color = input.color
  if (input.icon !== undefined) updates.icon = input.icon

  const { error } = await admin
    .from('categories')
    .update(updates)
    .eq('id', input.categoryId)

  if (error) return { error: error.message }

  return { message: 'Categoria atualizada com sucesso.' }
}

export async function deleteCategory(categoryId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const { error } = await admin
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) return { error: error.message }

  return { message: 'Categoria deletada com sucesso.' }
}

// ── GESTÃO DE TAREFAS ─────────────────────────────────────────────────────

export async function assignTask(input: {
  title: string
  description?: string
  dueDate: string
  dueTime?: string
  priority: 'baixa' | 'normal' | 'alta' | 'urgente'
  assigneeId: string
  categoryId?: string | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, departmentId, userId } = caller

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      due_date: input.dueDate,
      due_time: input.dueTime || null,
      priority: input.priority,
      assigned_to: input.assigneeId,
      assigned_by_user_id: userId,
      user_id: userId,
      category_id: input.categoryId || null,
      department_id: canPickAnyDepartment(role) ? null : departmentId,
      status: 'pending',
      recurrence: input.recurrence || 'none',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  return {
    task: data,
    message: 'Tarefa atribuída com sucesso.',
  }
}

export async function updateTask(input: {
  taskId: string
  title?: string
  description?: string
  dueDate?: string
  dueTime?: string
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente'
  status?: 'pending' | 'in_progress' | 'done'
  categoryId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const updates: any = {}
  if (input.title) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.dueDate) updates.due_date = input.dueDate
  if (input.dueTime !== undefined) updates.due_time = input.dueTime
  if (input.priority) updates.priority = input.priority
  if (input.status) {
    updates.status = input.status
    if (input.status === 'done') {
      updates.completed_at = new Date().toISOString()
    }
  }
  if (input.categoryId !== undefined) updates.category_id = input.categoryId

  const { error } = await admin
    .from('tasks')
    .update(updates)
    .eq('id', input.taskId)

  if (error) return { error: error.message }

  return { message: 'Tarefa atualizada com sucesso.', taskId: input.taskId }
}

export async function completeTask(taskId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const { error } = await admin
    .from('tasks')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  return { message: 'Tarefa marcada como concluída.', taskId }
}

export async function deleteTask(taskId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }

  const admin = createAdminClient()

  const { error } = await admin
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) return { error: error.message }

  return { message: 'Tarefa deletada com sucesso.' }
}
