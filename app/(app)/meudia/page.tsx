import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeuDiaView } from '@/components/meudia/meudia-view'
import type { AppRole } from '@/lib/types'

export const metadata = { title: 'Meu Dia | Plataforma' }

function normalizeTaskCategories<T extends { categories?: { name: string; color: string }[] | { name: string; color: string } | null }>(tasks: T[]) {
  return tasks.map((task) => {
    const category = Array.isArray(task.categories) ? task.categories[0] ?? null : task.categories ?? null
    return {
      ...task,
      categories: category ? { name: category.name, color: category.color } : null,
    }
  })
}

export default async function MeuDiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = today
  const taskScopeFilter = `assigned_to.eq.${user.id},and(user_id.eq.${user.id},assigned_to.is.null)`

  // Tarefas do dia selecionado
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, due_time, status, is_starred, category_id, priority, recurrence, categories(name, color)')
    .or(taskScopeFilter)
    .eq('due_date', selectedDate)
    .order('due_time', { ascending: true })

  // Tarefas em atraso (vencidas e não concluídas)
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, due_time, status, is_starred, category_id, priority, recurrence, categories(name, color)')
    .or(taskScopeFilter)
    .lt('due_date', selectedDate)
    .neq('status', 'done')
    .order('due_date', { ascending: true })

  const categoriesQuery = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  const normalizedTodayTasks = normalizeTaskCategories(todayTasks ?? [])
  const normalizedOverdueTasks = normalizeTaskCategories(overdueTasks ?? [])

  return (
    <MeuDiaView
      userId={user.id}
      userName={profile?.full_name ?? user.email ?? 'Usuário'}
      role={(profile?.role ?? 'funcionario') as AppRole}
      todayTasks={normalizedTodayTasks}
      overdueTasks={normalizedOverdueTasks}
      categories={categoriesQuery.data ?? []}
      selectedDate={selectedDate}
    />
  )
}
