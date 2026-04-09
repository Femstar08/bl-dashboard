// Xero OAuth 2.0 configuration
export const XERO_CONFIG = {
  clientId: process.env.XERO_CLIENT_ID!,
  clientSecret: process.env.XERO_CLIENT_SECRET!,
  redirectUri: process.env.XERO_REDIRECT_URI!,
  scopes: 'openid profile email accounting.transactions.read accounting.contacts.read offline_access',
  authorizeUrl: 'https://login.xero.com/identity/connect/authorize',
  tokenUrl: 'https://identity.xero.com/connect/token',
  connectionsUrl: 'https://api.xero.com/connections',
  apiBase: 'https://api.xero.com/api.xro/2.0',
} as const
