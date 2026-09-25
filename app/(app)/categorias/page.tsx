import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoriesView } from '@/components/categories/categories-view'
import type { Category } from '@/lib/types'

export const metadata = { title: 'Categorias | Plataforma' }

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('"order"', { ascending: true })

  return (
    <CategoriesView
      userId={user.id}
      initialCategories={(data ?? []) as Category[]}
      error={error?.message}
    />
  )
}
