'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'
import { logAudit } from '@/lib/audit'

export async function getCategories() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('"order"', { ascending: true })

  if (error) return { error: error.message }
  return { categories: data as Category[] }
}

export async function createCategory(name: string, color: string, icon?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      color,
      user_id: user.id,
      icon: icon || null,
      order: 0,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'category.created',
    entity: 'category',
    entityId: data.id,
    description: `Categoria "${name}" criada`,
    metadata: { name, color, icon },
  })

  revalidatePath('/categorias')
  return { category: data as Category }
}

export async function updateCategory(id: string, name?: string, color?: string, icon?: string, order?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const updates: Record<string, any> = {}
  if (name !== undefined) updates.name = name.trim()
  if (color !== undefined) updates.color = color
  if (icon !== undefined) updates.icon = icon
  if (order !== undefined) updates.order = order

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'category.updated',
    entity: 'category',
    entityId: id,
    description: `Categoria atualizada`,
    metadata: updates,
  })

  revalidatePath('/categorias')
  return { category: data as Category }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logAudit({
    userId: user.id,
    action: 'category.deleted',
    entity: 'category',
    entityId: id,
    description: `Categoria excluida`,
    metadata: { id },
  })

  revalidatePath('/categorias')
  return { success: true }
}

export async function reorderCategories(categories: { id: string; order: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  for (const cat of categories) {
    await supabase
      .from('categories')
      .update({ order: cat.order })
      .eq('id', cat.id)
      .eq('user_id', user.id)
  }

  revalidatePath('/categorias')
  return { success: true }
}
