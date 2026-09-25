import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanningView } from '@/components/planning/planning-view'
import type { Category } from '@/lib/types'

interface PlanningTask {
  id: string
  title: string
  due_date?: string
  due_time?: string | null
  priority?: string
  status: string
  is_starred: boolean
  categories?: { name: string; color: string } | null
}

export const metadata = { title: 'Planejamento | Plataforma' }

export default async function PlanejamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()
  const rangeStart = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0]
  const rangeEnd = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, due_time, priority, status, is_starred, categories(name, color)')
    .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
    .gte('due_date', rangeStart)
    .lte('due_date', rangeEnd)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true })

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  return (
    <PlanningView
      userId={user.id}
      initialTasks={(tasks ?? []) as PlanningTask[]}
      initialCategories={(categories ?? []) as Category[]}
    />
  )
}
