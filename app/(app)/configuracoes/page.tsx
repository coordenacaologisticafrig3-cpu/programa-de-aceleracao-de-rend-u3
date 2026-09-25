import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ConfiguracoesView } from '@/components/configuracoes/configuracoes-view'
import type { AppRole } from '@/lib/types'

export const metadata = {
  title: 'Configuracoes — Tetra',
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const { data: integrations } = await supabase
    .from('calendar_integrations')
    .select('provider, is_active, connected_at, calendar_id')
    .eq('user_id', user.id)

  const googleIntegration = integrations?.find((i) => i.provider === 'google') ?? null
  const outlookIntegration = integrations?.find((i) => i.provider === 'outlook') ?? null

  return (
    <Suspense fallback={null}>
      <ConfiguracoesView
        userId={user.id}
        userEmail={user.email ?? ''}
        role={(profile?.role ?? 'funcionario') as AppRole}
        googleIntegration={googleIntegration}
        outlookIntegration={outlookIntegration}
      />
    </Suspense>
  )
}
