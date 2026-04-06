'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 40,
        width: '100%',
        maxWidth: 400,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--accent)',
            marginBottom: 8,
          }}>
            Beacon &amp; Ledger
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Dashboard — Sign in to continue
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            color: 'var(--text-muted)',
            fontSize: 13,
            marginBottom: 6,
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-mid)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box' as const,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            color: 'var(--text-muted)',
            fontSize: 13,
            marginBottom: 6,
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-mid)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box' as const,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#F87171',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            width: '100%',
            padding: 12,
            background: loading ? 'var(--bg-mid)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#0F1B35',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
