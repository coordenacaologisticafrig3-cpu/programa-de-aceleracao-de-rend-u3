'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'
import { canPickAnyDepartment, isDeptGestor, isStaffRole } from '@/lib/roles'
import { syncTaskToCalendars } from '@/app/actions/sync-calendar'
import { logAudit } from '@/lib/audit'
type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

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
    supabase,
    user,
    role: profile.role as AppRole,
    departmentId: profile.department_id as string | null,
  }
}

export async function createAssignedTasks(input: {
  assigneeIds: string[]
  title: string
  description?: string
  categoryId?: string | null
  dueDate: string
  dueTime?: string | null
  priority: Priority
  recurrence: Recurrence
  departmentId?: string | null
}) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { supabase, user, role, departmentId } = caller

  if (!isStaffRole(role)) return { error: 'Sem permissao para atribuir tarefas.' }
  if (!input.title.trim()) return { error: 'Titulo obrigatorio.' }
  if (!input.assigneeIds.length) return { error: 'Selecione ao menos um colaborador.' }

  let allowedIds = input.assigneeIds
  if (isDeptGestor(role)) {
    const { data: team } = await supabase
      .from('profiles')
      .select('id')
      .eq('department_id', departmentId)
      .in('id', input.assigneeIds)
    allowedIds = (team ?? []).map((p: any) => p.id)
    if (!allowedIds.length) return { error: 'Nenhum colaborador valido no seu departamento.' }
  }

  // user_id da recorrência = o primeiro assignee (para ele ver na página /recorrencia)
  const firstAssigneeId = allowedIds[0] ?? user.id

  // Se a tarefa for recorrente, criar entrada na tabela recurrences
  let recurrenceId: string | null = null
  if (input.recurrence !== 'none') {
    const endDate = new Date(input.dueDate)
    endDate.setDate(endDate.getDate() + 30)

    const { data: recurrenceData, error: recurrenceError } = await supabase
      .from('recurrences')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        frequency: input.recurrence as 'daily' | 'weekly' | 'monthly',
        start_date: input.dueDate,
        end_date: endDate.toISOString().split('T')[0],
        time: input.dueTime || null,
        priority: input.priority,
        days_of_week: input.recurrence === 'daily' ? [1, 2, 3, 4, 5] : null,
        user_id: firstAssigneeId,   // dono = o assignee, para aparecer na página dele
        department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
        is_active: true,
      })
      .select('id')
      .single()

    if (!recurrenceError && recurrenceData) {
      recurrenceId = recurrenceData.id
    }
  }

  // Se recorrência diária, gerar instâncias para os próximos 30 dias (segunda a sexta)
  let rows: any[] = []

  if (input.recurrence === 'daily') {
    const startDate = new Date(input.dueDate)
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    for (const assigneeId of allowedIds) {
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          rows.push({
            title: input.title.trim(),
            description: input.description?.trim() || null,
            user_id: assigneeId,         // dono = assignee
            assigned_to: assigneeId,
            assigned_by_user_id: user.id,
            department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
            category_id: input.categoryId || null,
            due_date: currentDate.toISOString().split('T')[0],
            due_time: input.dueTime || null,
            priority: input.priority,
            recurrence: 'none',
            recurrence_id: recurrenceId,  // vincular à recorrência pai
            status: 'pending',
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
  } else {
    rows = allowedIds.map((assigneeId) => ({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      user_id: assigneeId,          // dono = assignee
      assigned_to: assigneeId,
      assigned_by_user_id: user.id,
      department_id: canPickAnyDepartment(role) ? (input.departmentId || null) : departmentId,
      category_id: input.categoryId || null,
      due_date: input.dueDate,
      due_time: input.dueTime || null,
      priority: input.priority,
      recurrence: input.recurrence,
      recurrence_id: recurrenceId,  // vincular à recorrência pai
      status: 'pending',
    }))
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select('id, title, status, due_date, due_time, priority, user_id, assigned_to, assigned_by_user_id, created_at')

  if (error) return { error: error.message }

  // Sincronizar cada tarefa criada com os calendários do usuário atribuído
  if (data && data.length > 0) {
    for (const task of data) {
      console.log('[v0] Sync task:', task.id, 'to user:', task.assigned_to)
      const syncResult = await syncTaskToCalendars({
        taskId: task.id,
        title: task.title,
        description: input.description,
        dueDate: task.due_date,
        dueTime: task.due_time,
        priority: task.priority,
        assignedToUserId: task.assigned_to,
      })
      console.log('[v0] Sync result:', syncResult)
    }
  }

  await logAudit({
    userId: user.id,
    action: 'task.assigned',
    entity: 'task',
    description: `${rows.length} tarefa(s) criada(s): "${input.title}"`,
    metadata: {
      title: input.title,
      assignedTo: input.assignedTo,
      recurrence: input.recurrence,
      totalInstances: rows.length,
      dueDate: input.dueDate,
    },
  })

  return {
    tasks: data ?? [],
    totalInstances: rows.length,
    recurrenceId,
    isRecurring: input.recurrence !== 'none',
  }
}

export async function updateAssignedTask(
  taskId: string,
  updates: {
    title: string
    description?: string | null
    categoryId?: string | null
    dueDate: string
    dueTime?: string | null
    priority: Priority
    recurrence: Recurrence
  }
) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { supabase, user, role } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissao.' }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, assigned_by_user_id')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Tarefa nao encontrada.' }
  if (task.status === 'done') return { error: 'Nao e possivel editar tarefa concluida.' }
  if (isDeptGestor(role) && task.assigned_by_user_id !== user.id) {
    return { error: 'Gestor so pode editar tarefas atribuidas por ele.' }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: updates.title.trim(),
      description: updates.description?.trim() || null,
      category_id: updates.categoryId || null,
      due_date: updates.dueDate,
      due_time: updates.dueTime || null,
      priority: updates.priority,
      recurrence: updates.recurrence,
    })
    .eq('id', taskId)
    .select('id, title, status, due_date, due_time, priority, recurrence')
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'task.updated',
    entity: 'task',
    entityId: taskId,
    description: `Tarefa "${updates.title}" atualizada`,
    metadata: { taskId, ...updates },
  })

  return { task: data }
}

export async function deleteAssignedTask(taskId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, user } = caller

  const admin = createAdminClient()

  const { data: task } = await admin
    .from('tasks')
    .select('id, title, user_id, assigned_to')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Tarefa nao encontrada.' }

  // Gestor/admin/owner pode deletar qualquer tarefa; usuario comum so pode deletar suas proprias
  const isOwner = (task as any).user_id === user.id || (task as any).assigned_to === user.id
  if (!isStaffRole(role) && !isOwner) return { error: 'Sem permissao para excluir esta tarefa.' }

  const { error } = await admin.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'task.deleted',
    entity: 'task',
    entityId: taskId,
    description: `Tarefa "${(task as any).title}" excluida`,
    metadata: { taskId },
  })

  return { success: true }
}

export async function deleteRecurringTasks(recurrenceId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissao.' }

  // Usar admin client para contornar RLS
  const admin = createAdminClient()

  // Deletar todas as tarefas vinculadas a esta recorrência
  const { error: tasksError } = await admin
    .from('tasks')
    .delete()
    .eq('recurrence_id', recurrenceId)

  if (tasksError) return { error: tasksError.message }

  // Deletar a entrada da recorrência também
  await admin.from('recurrences').delete().eq('id', recurrenceId)

  const { user } = caller
  await logAudit({
    userId: user.id,
    action: 'task.recurring_deleted',
    entity: 'recurrence',
    entityId: recurrenceId,
    description: `Todas as instâncias da recorrência excluidas`,
    metadata: { recurrenceId },
  })

  return { success: true }
}

export async function deleteAllTasksByUser(userId: string) {
  const caller = await getCaller()
  if ('error' in caller) return { error: caller.error }
  const { role, user } = caller
  if (!isStaffRole(role)) return { error: 'Sem permissao.' }

  // Garantir que só pode deletar suas proprias tarefas, exceto se for admin/owner
  if (role !== 'admin' && role !== 'owner' && user.id !== userId) {
    return { error: 'Nao pode deletar tarefas de outro usuario.' }
  }

  const admin = createAdminClient()

  // Buscar todas as recorrências do usuário para deletar
  const { data: recurrences } = await admin
    .from('recurrences')
    .select('id')
    .eq('user_id', userId)

  // Deletar as recorrências primeiro (isso vai deletar as tasks via foreign key ou via delete em cascade)
  if (recurrences && recurrences.length > 0) {
    const recurrenceIds = recurrences.map((r) => r.id)
    await admin
      .from('recurrences')
      .delete()
      .in('id', recurrenceIds)
  }

  // Deletar todas as tarefas nao-recorrentes do usuario
  const { error } = await admin
    .from('tasks')
    .delete()
    .eq('user_id', userId)

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'task.all_deleted',
    entity: 'user',
    entityId: userId,
    description: `Todas as tarefas do usuario excluidas`,
    metadata: { targetUserId: userId },
  })

  return { success: true }
}

// Marcar tarefa como concluida — registra horario exato no log
export async function markTaskDone(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }

  const admin = createAdminClient()
  const completedAt = new Date().toISOString()

  const { data: task } = await admin
    .from('tasks')
    .select('id, title, user_id, assigned_to')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Tarefa nao encontrada.' }

  const isOwner = (task as any).user_id === user.id || (task as any).assigned_to === user.id
  if (!isOwner) return { error: 'Sem permissao.' }

  const { error } = await admin
    .from('tasks')
    .update({ status: 'done', completed_at: completedAt })
    .eq('id', taskId)

  if (error) return { error: error.message }

  const dt = new Date(completedAt)
  const formattedDate = dt.toLocaleDateString('pt-BR')
  const formattedTime = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  await logAudit({
    userId: user.id,
    action: 'task.completed',
    entity: 'task',
    entityId: taskId,
    description: `Tarefa concluida: "${(task as any).title}" — finalizada em ${formattedDate} as ${formattedTime}`,
    metadata: {
      taskId,
      title: (task as any).title,
      completedAt,
      completedDate: formattedDate,
      completedTime: formattedTime,
    },
  })

  return { success: true, completedAt }
}

// Criacao rapida de tarefa para si mesmo (sem recorrencia), usada no Meu Dia
export async function createQuickTask(input: {
  title: string
  dueDate: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }
  if (!input.title.trim()) return { error: 'Titulo obrigatorio.' }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tasks')
    .insert({
      user_id: user.id,
      assigned_to: user.id,
      assigned_by_user_id: user.id,
      title: input.title.trim(),
      due_date: input.dueDate,
      status: 'pending',
      recurrence: 'none',
    })
    .select('id, title, due_date, due_time, status, is_starred, category_id, priority, recurrence, categories(name, color)')
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'task.assigned',
    entity: 'task',
    entityId: data.id,
    description: `Tarefa rapida criada: "${input.title.trim()}"`,
    metadata: { title: input.title.trim(), dueDate: input.dueDate },
  })

  return { data }
}

// Qualquer usuario pode criar tarefa recorrente para si mesmo
export async function createSelfTask(input: {
  title: string
  description?: string
  categoryId?: string | null
  dueDate: string
  dueTime?: string | null
  priority: Priority
  recurrence: Recurrence
  weeklyDays?: number[]
  monthlyDays?: number[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }
  if (!input.title.trim()) return { error: 'Titulo obrigatorio.' }

  const admin = createAdminClient()

  let recurrenceId: string | null = null

  if (input.recurrence !== 'none') {
    const endDate = new Date(input.dueDate)
    endDate.setDate(endDate.getDate() + 30)

    const { data: recurrenceData } = await admin
      .from('recurrences')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        frequency: input.recurrence as 'daily' | 'weekly' | 'monthly',
        start_date: input.dueDate,
        end_date: endDate.toISOString().split('T')[0],
        time: input.dueTime || null,
        priority: input.priority,
        days_of_week: input.recurrence === 'daily' ? [1, 2, 3, 4, 5] : (input.weeklyDays?.length ? input.weeklyDays : null),
        day_of_month: input.recurrence === 'monthly' ? (input.monthlyDays?.[0] || null) : null,
        user_id: user.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (recurrenceData) recurrenceId = recurrenceData.id
  }

  // Gerar instâncias de tarefas
  const rows: any[] = []

  if (input.recurrence === 'daily') {
    const startDate = new Date(input.dueDate)
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const current = new Date(startDate)

    while (current <= endDate) {
      const dow = current.getDay()
      if (dow >= 1 && dow <= 5) {
        rows.push({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          user_id: user.id,
          assigned_to: user.id,
          assigned_by_user_id: user.id,
          category_id: input.categoryId || null,
          due_date: current.toISOString().split('T')[0],
          due_time: input.dueTime || null,
          priority: input.priority,
          recurrence: 'none',
          recurrence_id: recurrenceId,
          status: 'pending',
        })
      }
      current.setDate(current.getDate() + 1)
    }
  } else if (input.recurrence === 'weekly' && input.weeklyDays?.length) {
    const startDate = new Date(input.dueDate)
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const current = new Date(startDate)

    while (current <= endDate) {
      const dow = current.getDay()
      if (input.weeklyDays.includes(dow)) {
        rows.push({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          user_id: user.id,
          assigned_to: user.id,
          assigned_by_user_id: user.id,
          category_id: input.categoryId || null,
          due_date: current.toISOString().split('T')[0],
          due_time: input.dueTime || null,
          priority: input.priority,
          recurrence: 'weekly',
          recurrence_id: recurrenceId,
          status: 'pending',
        })
      }
      current.setDate(current.getDate() + 1)
    }
  } else if (input.recurrence === 'monthly' && input.monthlyDays?.length) {
    const startDate = new Date(input.dueDate)
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const current = new Date(startDate)

    while (current <= endDate) {
      if (input.monthlyDays.includes(current.getDate())) {
        rows.push({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          user_id: user.id,
          assigned_to: user.id,
          assigned_by_user_id: user.id,
          category_id: input.categoryId || null,
          due_date: current.toISOString().split('T')[0],
          due_time: input.dueTime || null,
          priority: input.priority,
          recurrence: 'monthly',
          recurrence_id: recurrenceId,
          status: 'pending',
        })
      }
      current.setDate(current.getDate() + 1)
    }
  } else {
    rows.push({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      user_id: user.id,
      assigned_to: user.id,
      assigned_by_user_id: user.id,
      category_id: input.categoryId || null,
      due_date: input.dueDate,
      due_time: input.dueTime || null,
      priority: input.priority,
      recurrence: input.recurrence,
      recurrence_id: recurrenceId,
      status: 'pending',
    })
  }

  if (!rows.length) return { error: 'Nenhuma instância de tarefa gerada para o período.' }

  const { data, error } = await admin
    .from('tasks')
    .insert(rows)
    .select('id, title, due_date')

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'task.assigned',
    entity: 'task',
    description: `${rows.length} tarefa(s) propria(s) criada(s): "${input.title}"`,
    metadata: { title: input.title, recurrence: input.recurrence, totalInstances: rows.length },
  })

  return { success: true, totalInstances: rows.length, recurrenceId }
}

