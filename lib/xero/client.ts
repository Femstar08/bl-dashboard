import { createClient } from '@supabase/supabase-js'
import { XERO_CONFIG } from './config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: XERO_CONFIG.redirectUri,
  })

  const res = await fetch(XERO_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${XERO_CONFIG.clientId}:${XERO_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }>
}

// Refresh an expired access token
export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(XERO_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${XERO_CONFIG.clientId}:${XERO_CONFIG.clientSecret}`).toString('base64')}`,
    },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }>
}

// Get connected Xero tenants (organisations)
export async function getConnections(accessToken: string) {
  const res = await fetch(XERO_CONFIG.connectionsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch Xero connections')

  return res.json() as Promise<Array<{
    id: string
    tenantId: string
    tenantName: string
    tenantType: string
  }>>
}

// Get a valid access token, refreshing if expired
export async function getValidToken(): Promise<{ accessToken: string; tenantId: string }> {
  const { data: tokenRow, error } = await supabase
    .from('bl_xero_tokens')
    .select('*')
    .limit(1)
    .single()

  if (error || !tokenRow) {
    throw new Error('No Xero connection found. Please connect Xero first.')
  }

  const now = new Date()
  const expiresAt = new Date(tokenRow.expires_at)

  // Refresh if token expires in less than 2 minutes
  if (expiresAt.getTime() - now.getTime() < 120_000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token)

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

    await supabase
      .from('bl_xero_tokens')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRow.id)

    return { accessToken: refreshed.access_token, tenantId: tokenRow.tenant_id }
  }

  return { accessToken: tokenRow.access_token, tenantId: tokenRow.tenant_id }
}

// Generic Xero API call with automatic token refresh
export async function xeroApiGet<T>(path: string): Promise<T> {
  const { accessToken, tenantId } = await getValidToken()

  const res = await fetch(`${XERO_CONFIG.apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Xero API error (${res.status}): ${err}`)
  }

  return res.json()
}
