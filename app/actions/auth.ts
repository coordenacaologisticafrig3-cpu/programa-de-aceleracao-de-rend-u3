'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    await logAudit({
      userId: data.user.id,
      action: 'user.signed_in',
      entity: 'user',
      entityId: data.user.id,
      description: `Login realizado`,
      metadata: { email },
    })
  }

  revalidatePath('/', 'layout')
  redirect('/meudia')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}/meudia`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    await logAudit({
      userId: data.user.id,
      action: 'user.created',
      entity: 'user',
      entityId: data.user.id,
      description: `Novo usuario registrado`,
      metadata: { email },
    })
  }

  return { success: 'Verifique seu e-mail para confirmar o cadastro.' }
}

export async function signOut() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await logAudit({
      userId: user.id,
      action: 'user.signed_out',
      entity: 'user',
      entityId: user.id,
      description: `Logout realizado`,
      metadata: { email: user.email },
    })
  }
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
