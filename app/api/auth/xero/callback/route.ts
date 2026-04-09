import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exchangeCodeForTokens, getConnections } from '@/lib/xero/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/auth/xero/callback — handle Xero OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${siteUrl}?xero_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}?xero_error=no_code`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Get the connected organisation
    const connections = await getConnections(tokens.access_token)
    if (!connections.length) {
      return NextResponse.redirect(`${siteUrl}?xero_error=no_organisation`)
    }

    const org = connections[0]

    // Upsert token — one row per tenant
    await supabase.from('bl_xero_tokens').upsert(
      {
        tenant_id: org.tenantId,
        tenant_name: org.tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_at: expiresAt.toISOString(),
        scopes: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )

    return NextResponse.redirect(`${siteUrl}?xero_connected=${encodeURIComponent(org.tenantName)}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Xero callback error:', message)
    return NextResponse.redirect(`${siteUrl}?xero_error=${encodeURIComponent(message)}`)
  }
}
