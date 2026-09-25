'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Recurrence, RecurrenceFrequency } from '@/lib/types'

export async function getRecurrences() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { recurrences: data as Recurrence[] }
}

export async function createRecurrence(
  title: string,
  frequency: RecurrenceFrequency,
  startDate: string,
  options: {
    description?: string
    categoryId?: string
    priority?: 'baixa' | 'normal' | 'alta' | 'urgente'
    endDate?: string
    time?: string
    daysOfWeek?: number[]
    dayOfMonth?: string
    intervalDays?: number
  } = {}
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const normalizedDaysOfWeek = options.daysOfWeek && options.daysOfWeek.length > 0 ? options.daysOfWeek : [1, 2, 3, 4, 5]
  const normalizedDayOfMonth = options.dayOfMonth || '1'
  const normalizedIntervalDays = options.intervalDays && options.intervalDays > 0 ? options.intervalDays : 1

  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      title: title.trim(),
      frequency,
      start_date: startDate,
      user_id: user.id,
      description: options.description || null,
      category_id: options.categoryId || null,
      priority: options.priority || 'normal',
      end_date: options.endDate || null,
      time: options.time || null,
      days_of_week: frequency === 'weekly' ? normalizedDaysOfWeek : [],
      day_of_month: frequency === 'monthly' ? normalizedDayOfMonth : null,
      interval_days: frequency === 'daily' ? 1 : (frequency === 'custom' ? normalizedIntervalDays : null),
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/recorrencia')
  return { recurrence: data as Recurrence }
}

export async function updateRecurrence(
  id: string,
  updates: Partial<{
    title: string
    description: string
    categoryId: string
    priority: 'baixa' | 'normal' | 'alta' | 'urgente'
    frequency: RecurrenceFrequency
    startDate: string
    endDate: string | null
    time: string | null
    daysOfWeek: number[]
    dayOfMonth: string
    intervalDays: number
    isActive: boolean
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const payload: Record<string, any> = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId
  if (updates.priority !== undefined) payload.priority = updates.priority
  if (updates.frequency !== undefined) payload.frequency = updates.frequency
  if (updates.startDate !== undefined) payload.start_date = updates.startDate
  if (updates.endDate !== undefined) payload.end_date = updates.endDate
  if (updates.time !== undefined) payload.time = updates.time
  if (updates.daysOfWeek !== undefined) payload.days_of_week = updates.daysOfWeek
  if (updates.dayOfMonth !== undefined) payload.day_of_month = updates.dayOfMonth
  if (updates.intervalDays !== undefined) payload.interval_days = updates.intervalDays
  if (updates.isActive !== undefined) payload.is_active = updates.isActive

  const { data, error } = await supabase
    .from('recurrences')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/recorrencia')
  return { recurrence: data as Recurrence }
}

export async function deleteRecurrence(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('recurrences')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/recorrencia')
  return { success: true }
}

export async function toggleRecurrenceActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('recurrences')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/recorrencia')
  return { recurrence: data as Recurrence }
}
