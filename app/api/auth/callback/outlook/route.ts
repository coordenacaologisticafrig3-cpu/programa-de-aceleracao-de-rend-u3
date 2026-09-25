import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID ?? ''
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const REDIRECT_URI = `${APP_URL}/api/auth/callback/outlook`
const TENANT = process.env.OUTLOOK_TENANT_ID ?? 'common'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/configuracoes?error=outlook_denied`)
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: OUTLOOK_CLIENT_ID,
        client_secret: OUTLOOK_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      return NextResponse.redirect(`${APP_URL}/configuracoes?error=outlook_token&detail=${encodeURIComponent(tokens.error_description ?? tokens.error)}`)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/login`)
    }

    const admin = createAdminClient()
    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    const { error: dbError } = await admin
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'outlook',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? '',
        token_expiry: expiry,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (dbError) {
      return NextResponse.redirect(`${APP_URL}/configuracoes?error=outlook_db`)
    }

    return NextResponse.redirect(`${APP_URL}/configuracoes?success=outlook`)
  } catch {
    return NextResponse.redirect(`${APP_URL}/configuracoes?error=outlook_error`)
  }
}
