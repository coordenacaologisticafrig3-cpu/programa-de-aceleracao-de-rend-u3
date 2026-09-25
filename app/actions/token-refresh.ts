'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function refreshGoogleToken(userId: string, refreshToken: string) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const tokens = await response.json()

    if (tokens.error) {
      console.log('[v0] Google refresh error:', tokens.error)
      return { success: false, error: tokens.error }
    }

    // Atualizar token no banco
    const admin = createAdminClient()
    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    await admin
      .from('calendar_integrations')
      .update({
        access_token: tokens.access_token,
        token_expiry: expiry,
      })
      .eq('user_id', userId)
      .eq('provider', 'google')

    return { success: true, accessToken: tokens.access_token }
  } catch (err) {
    console.log('[v0] Token refresh exception:', err)
    return { success: false, error: 'Erro ao refrescar token' }
  }
}

export async function refreshOutlookToken(userId: string, refreshToken: string) {
  const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID ?? ''
  const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET ?? ''
  const OUTLOOK_TENANT_ID = process.env.OUTLOOK_TENANT_ID ?? ''

  try {
    const response = await fetch(`https://login.microsoftonline.com/${OUTLOOK_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: OUTLOOK_CLIENT_ID,
        client_secret: OUTLOOK_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const tokens = await response.json()

    if (tokens.error) {
      console.log('[v0] Outlook refresh error:', tokens.error)
      return { success: false, error: tokens.error }
    }

    // Atualizar token no banco
    const admin = createAdminClient()
    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    await admin
      .from('calendar_integrations')
      .update({
        access_token: tokens.access_token,
        token_expiry: expiry,
      })
      .eq('user_id', userId)
      .eq('provider', 'outlook')

    return { success: true, accessToken: tokens.access_token }
  } catch (err) {
    console.log('[v0] Outlook token refresh exception:', err)
    return { success: false, error: 'Erro ao refrescar token' }
  }
}
