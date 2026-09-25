import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecurrencesView } from '@/components/recurrences/recurrences-view'

export default async function RecorrenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Pegar perfil do usuário para verificar role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'funcionario'

  // Buscar recorrências de duas formas:
  // 1) recorrências onde user_id = usuário (criadas por ele ou pelo assistente para ele)
  // 2) recorrências vinculadas via recurrence_id em tasks onde assigned_to = usuário
  const [{ data: ownedRecurrences }, { data: assignedTasksWithRecurrence }, { data: categories }] = await Promise.all([
    supabase
      .from('recurrences')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('recurrence_id')
      .eq('assigned_to', user.id)
      .not('recurrence_id', 'is', null),
    supabase
      .from('categories')
      .select('id, name, color, icon')
      .order('name', { ascending: true }),
  ])

  const uniqueRecurrences = new Map<string, any>()

  // Adicionar recorrências próprias
  for (const rec of (ownedRecurrences || [])) {
    if (rec?.id) uniqueRecurrences.set(rec.id, rec)
  }

  // Buscar recorrências vinculadas a tasks atribuídas mas que não são do user_id
  const extraRecurrenceIds = [...new Set(
    (assignedTasksWithRecurrence || [])
      .map((t: any) => t.recurrence_id)
      .filter((id: string | null) => id && !uniqueRecurrences.has(id))
  )]

  if (extraRecurrenceIds.length > 0) {
    const { data: extraRecurrences } = await supabase
      .from('recurrences')
      .select('*')
      .in('id', extraRecurrenceIds)

    for (const rec of (extraRecurrences || [])) {
      if (rec?.id) uniqueRecurrences.set(rec.id, rec)
    }
  }

  const recurrences = Array.from(uniqueRecurrences.values()).sort(
    (a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  )

  return (
    <RecurrencesView
      userId={user.id}
      userRole={userRole}
      initialRecurrences={recurrences}
      categories={(categories ?? []) as any}
    />
  )
}
