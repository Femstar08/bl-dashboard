'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Sun, Moon, Monitor, Bot, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/growth', label: 'Growth' },
  { href: '/content', label: 'Content' },
  { href: '/prospects', label: 'Prospects' },
  { href: '/requirements', label: 'Requirements' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/angel', label: 'Angel' },
  { href: '/agents', label: 'Agents' },
  { href: '/health', label: 'Health' },
]

export default function Nav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      height: 52,
      background: 'var(--bg-mid)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: 'inherit',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontWeight: 800,
          fontSize: 16,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
        }}>
          Beacon & Ledger
        </span>
      </Link>

      {/* Desktop nav links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }} className="nav-desktop">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive(item.href) ? 600 : 400,
              color: isActive(item.href) ? 'var(--accent)' : 'var(--text-muted)',
              padding: '6px 12px',
              borderRadius: 6,
              borderBottom: isActive(item.href) ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Theme toggle + mobile menu button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'var(--bg-card)',
          borderRadius: 8,
          padding: 2,
          border: '1px solid var(--border)',
        }} className="nav-desktop">
          {([
            { value: 'light' as const, icon: <Sun size={14} /> },
            { value: 'system' as const, icon: <Monitor size={14} /> },
            { value: 'dark' as const, icon: <Moon size={14} /> },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              aria-label={`${opt.value} theme`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: theme === opt.value ? 'var(--accent)' : 'transparent',
                color: theme === opt.value ? 'var(--bg-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {/* Sign out button */}
        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="nav-desktop"
        >
          <LogOut size={12} /> Sign out
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          className="nav-mobile-btn"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="nav-mobile-dropdown"
          style={{
            position: 'absolute',
            top: 52,
            left: 0,
            right: 0,
            background: 'var(--bg-mid)',
            borderBottom: '1px solid var(--border)',
            padding: '8px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 49,
          }}
        >
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive(item.href) ? 600 : 400,
                color: isActive(item.href) ? 'var(--accent)' : 'var(--text-muted)',
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive(item.href) ? 'var(--bg-card)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
          {/* Mobile sign out */}
          <button
            onClick={() => { setMobileOpen(false); handleLogout() }}
            style={{
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-muted)',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
          {/* Mobile theme toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            marginTop: 4,
          }}>
            {([
              { value: 'light' as const, icon: <Sun size={16} />, label: 'Light' },
              { value: 'system' as const, icon: <Monitor size={16} />, label: 'System' },
              { value: 'dark' as const, icon: <Moon size={16} />, label: 'Dark' },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  background: theme === opt.value ? 'var(--accent)' : 'var(--bg-card)',
                  color: theme === opt.value ? 'var(--bg-primary)' : 'var(--text-muted)',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
