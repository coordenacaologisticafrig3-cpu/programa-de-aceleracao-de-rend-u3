import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const REDIRECT_URI = `${APP_URL}/api/auth/google-calendar/callback`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/configuracoes?error=google_denied`)
  }

  try {
    // Trocar o code pelo token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    console.log('[v0] Google token response:', JSON.stringify(tokens))

    if (tokens.error) {
      console.log('[v0] Google token error:', tokens.error, tokens.error_description)
      return NextResponse.redirect(`${APP_URL}/configuracoes?error=google_token&detail=${encodeURIComponent(tokens.error_description ?? tokens.error)}`)
    }

    // Pegar o usuario autenticado via cookies da requisicao
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/login`)
    }

    // Salvar usando admin client para contornar RLS no contexto do Route Handler
    const admin = createAdminClient()
    const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()

    const { error: dbError } = await admin
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? '',
        token_expiry: expiry,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (dbError) {
      console.log('[v0] DB error saving google integration:', dbError.message)
      return NextResponse.redirect(`${APP_URL}/configuracoes?error=google_db`)
    }

    return NextResponse.redirect(`${APP_URL}/configuracoes?success=google`)
  } catch (err) {
    console.log('[v0] Google callback exception:', err)
    return NextResponse.redirect(`${APP_URL}/configuracoes?error=google_error`)
  }
}
