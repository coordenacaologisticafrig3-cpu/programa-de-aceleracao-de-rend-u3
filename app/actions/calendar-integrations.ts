'use server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function disconnectCalendar(provider: 'google' | 'outlook') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }

  const { error } = await supabase
    .from('calendar_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) return { error: 'Erro ao desconectar integracao.' }

  await logAudit({
    userId: user.id,
    action: 'integration.disconnected',
    entity: 'integration',
    description: `Integracao com ${provider} desconectada`,
    metadata: { provider },
  })

  return { success: true }
}

export async function saveCalendarIntegration(payload: {
  provider: 'google' | 'outlook'
  accessToken: string
  refreshToken: string
  tokenExpiry: string
  calendarId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado.' }

  const { error } = await supabase
    .from('calendar_integrations')
    .upsert({
      user_id: user.id,
      provider: payload.provider,
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
      token_expiry: payload.tokenExpiry,
      calendar_id: payload.calendarId ?? null,
      is_active: true,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })

  if (error) return { error: 'Erro ao salvar integracao.' }
  return { success: true }
}

export async function getCalendarIntegration(provider: 'google' | 'outlook') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await supabase
    .from('calendar_integrations')
    .select('provider, is_active, connected_at, calendar_id, access_token, refresh_token, token_expiry')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single()

  if (error) return { data: null, error: null }
  return { data, error: null }
}
