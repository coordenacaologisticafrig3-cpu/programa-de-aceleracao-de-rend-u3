import { NextResponse } from 'next/server'

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID ?? ''
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/callback/outlook`
const TENANT = process.env.OUTLOOK_TENANT_ID ?? 'common'

const SCOPES = [
  'Calendars.ReadWrite',
  'offline_access',
].join(' ')

export async function GET() {
  if (!OUTLOOK_CLIENT_ID) {
    return NextResponse.json({ error: 'Outlook OAuth nao configurado. Adicione OUTLOOK_CLIENT_ID nas variaveis de ambiente.' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: OUTLOOK_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    response_mode: 'query',
  })

  return NextResponse.redirect(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params}`)
}
