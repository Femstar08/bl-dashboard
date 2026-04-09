import { NextResponse } from 'next/server'
import { XERO_CONFIG } from '@/lib/xero/config'

// GET /api/auth/xero — initiate Xero OAuth flow
export async function GET() {
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: XERO_CONFIG.clientId,
    redirect_uri: XERO_CONFIG.redirectUri,
    scope: XERO_CONFIG.scopes,
    state,
  })

  const authorizeUrl = `${XERO_CONFIG.authorizeUrl}?${params}`

  return NextResponse.redirect(authorizeUrl)
}
