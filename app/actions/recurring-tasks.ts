'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'
import { isStaffRole } from '@/lib/roles'

export async function generateRecurringTaskInstances(input: {
  taskId: string
  recurrence: 'daily' | 'weekly' | 'monthly'
  startDate: string
  endDate?: string
  weekDays?: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
}) {
  const admin = createAdminClient()

  // Buscar a tarefa original
  const { data: task, error: taskError } = await (admin as any)
    .from('tasks')
    .select('*')
    .eq('id', input.taskId)
    .single()

  if (taskError || !task) return { error: 'Tarefa não encontrada.' }

  const startDate = new Date(input.startDate)
  const endDate = input.endDate ? new Date(input.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias por padrão

  const instances: any[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()

    // Filtro por dia da semana se definido (padrão: segunda a sexta = 1-5)
    const daysToUse = input.weekDays ?? [1, 2, 3, 4, 5]
    if (daysToUse.includes(dayOfWeek)) {
      instances.push({
        title: task.title,
        description: task.description,
        user_id: task.user_id,
        assigned_to: task.assigned_to,
        assigned_by_user_id: task.assigned_by_user_id,
        department_id: task.department_id,
        category_id: task.category_id,
        due_date: currentDate.toISOString().split('T')[0],
        due_time: task.due_time,
        priority: task.priority,
        recurrence: 'none', // Instâncias não são recorrentes, apenas a tarefa-mãe
        status: 'pending',
        parent_task_id: input.taskId, // Rastrear a tarefa pai (se a tabela suportar)
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  if (!instances.length) {
    return { message: 'Nenhuma instância gerada com os parâmetros fornecidos.', instances: [] }
  }

  // Inserir instâncias no banco
  const { data, error } = await (admin as any)
    .from('tasks')
    .insert(instances)
    .select('id, title, due_date, assigned_to')

  if (error) return { error: error.message }

  return {
    success: true,
    message: `${(data ?? []).length} instâncias de tarefa recorrente criadas.`,
    instances: data ?? [],
  }
}

export async function createRecurringAssignedTasks(input: {
  assigneeIds: string[]
  title: string
  description?: string
  categoryId?: string | null
  startDate: string
  endDate?: string
  dueTime?: string | null
  priority: 'baixa' | 'normal' | 'alta' | 'urgente'
  weekDays?: number[] // 0=Sun, 1=Mon, ..., 6=Sat. Padrão: 1-5 (seg-sex)
}) {
  const admin = createAdminClient()

  // Obter contexto do criador (para user_id e assigned_by_user_id)
  const { data: { user } } = await (admin as any).auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await (admin as any)
    .from('profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile || !isStaffRole(profile.role as AppRole)) {
    return { error: 'Sem permissão para criar tarefas recorrentes.' }
  }

  // Validar assignees
  if (!input.assigneeIds.length) return { error: 'Selecione ao menos um colaborador.' }
  if (!input.title.trim()) return { error: 'Título obrigatório.' }

  const weekDays = input.weekDays ?? [1, 2, 3, 4, 5] // Padrão: seg-sex
  const startDate = new Date(input.startDate)
  const endDate = input.endDate ? new Date(input.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  let allInstances: any[] = []

  // Para cada colaborador, criar instâncias diárias
  for (const assigneeId of input.assigneeIds) {
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()

      if (weekDays.includes(dayOfWeek)) {
        allInstances.push({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          user_id: user.id,
          assigned_to: assigneeId,
          assigned_by_user_id: user.id,
          department_id: profile.department_id,
          category_id: input.categoryId || null,
          due_date: currentDate.toISOString().split('T')[0],
          due_time: input.dueTime || null,
          priority: input.priority,
          recurrence: 'none', // Instâncias são tarefas normais
          status: 'pending',
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  if (!allInstances.length) {
    return { error: 'Nenhuma instância foi gerada com os parâmetros fornecidos.' }
  }

  // Inserir todas as instâncias
  const { data, error } = await (admin as any)
    .from('tasks')
    .insert(allInstances)
    .select('id, title, due_date, assigned_to, status')

  if (error) return { error: error.message }

  return {
    success: true,
    total: (data ?? []).length,
    message: `${(data ?? []).length} tarefas recorrentes criadas (${input.assigneeIds.length} colaboradores × ${Math.ceil(allInstances.length / input.assigneeIds.length)} dias).`,
    tasks: data ?? [],
  }
}
