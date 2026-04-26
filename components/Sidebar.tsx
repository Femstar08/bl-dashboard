'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BarChart2, TrendingUp, Users, Smile,
  PenLine, List, Bot, Activity, FileText, Sun, Moon, LogOut,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/',          label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics',    icon: BarChart2 },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/growth',    label: 'Growth',       icon: TrendingUp },
      { href: '/prospects', label: 'Prospects',    icon: Users },
      { href: '/angel',     label: 'Angel',        icon: Smile },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/content',      label: 'Content',      icon: PenLine },
      { href: '/requirements', label: 'Requirements', icon: List },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/agents', label: 'Agents', icon: Bot },
      { href: '/health', label: 'Health', icon: Activity },
      { href: '/audit',  label: 'Audit',  icon: FileText },
    ],
  },
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)

  const isOpen = pinned || hovered

  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?'
  const displayName = userEmail ? userEmail.split('@')[0] : 'User'

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <TooltipProvider delay={300}>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex h-screen flex-shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out',
          'border-[var(--border)] bg-[var(--bg-mid)]',
          isOpen ? 'w-[220px]' : 'w-[52px]'
        )}
      >
        {/* Logo */}
        <div className="flex h-[52px] flex-shrink-0 items-center px-3">
          {isOpen ? (
            <Link href="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }}>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--text-primary)]">
                <span className="text-[8px] font-black tracking-tighter text-[var(--accent)]">B&L</span>
              </div>
              <span className="text-[13px] font-extrabold tracking-tight text-[var(--text-primary)]">
                Beacon &amp; Ledger
              </span>
            </Link>
          ) : (
            <Link href="/" className="flex w-full items-center justify-center" style={{ textDecoration: 'none' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--text-primary)]">
                <span className="text-[8px] font-black tracking-tighter text-[var(--accent)]">B&L</span>
              </div>
            </Link>
          )}
        </div>

        <Separator className="bg-[var(--border)]" />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <Separator className="my-2 bg-[var(--border)]" />}
              {isOpen && (
                <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] opacity-60">
                  {group.label}
                </p>
              )}
              {group.items.map(item => {
                const active = isActive(item.href)
                const Icon = item.icon
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ textDecoration: 'none' }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2 py-[7px] transition-colors',
                      isOpen ? '' : 'justify-center',
                      active
                        ? 'border border-[var(--accent)]/20 bg-[var(--accent)]/10'
                        : 'hover:bg-[var(--bg-card)]'
                    )}
                  >
                    <Icon
                      size={14}
                      className={cn('flex-shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')}
                    />
                    {isOpen && (
                      <span
                        className={cn(
                          'text-[12px]',
                          active ? 'font-semibold text-[var(--accent)]' : 'font-medium text-[var(--text-muted)]'
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                )

                if (!isOpen) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-[10px] opacity-60">{group.label}</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return link
              })}
            </div>
          ))}
        </nav>

        <Separator className="bg-[var(--border)]" />

        {/* Footer */}
        <div className={cn('flex items-center gap-2 p-3', isOpen ? 'flex-col items-stretch' : 'flex-col items-center')}>
          {/* User info */}
          {isOpen ? (
            <div className="flex items-center gap-2 rounded-lg px-1 py-1">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold"
                style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
              >
                {userInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{displayName}</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] opacity-60">Team</span>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="flex h-7 w-7 cursor-default items-center justify-center rounded-full text-[11px] font-extrabold"
                  style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
                >
                  {userInitial}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName}</TooltipContent>
            </Tooltip>
          )}

          <Separator className="bg-[var(--border)]" />

          {/* Theme pill + sign out row */}
          <div className={cn('flex items-center gap-2', isOpen ? 'justify-between' : 'flex-col')}>
            {/* Theme pill */}
            <div className="flex rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-[2px] gap-[2px]">
              <button
                onClick={() => setTheme('light')}
                aria-label="Light mode"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded transition-colors',
                  theme === 'light'
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <Sun size={11} />
              </button>
              <button
                onClick={() => setTheme('dark')}
                aria-label="Dark mode"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded transition-colors',
                  theme === 'dark'
                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <Moon size={11} />
              </button>
            </div>

            {/* Sign out (expanded only) */}
            {isOpen && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <LogOut size={11} />
                Sign out
              </button>
            )}

            {/* Sign out icon (collapsed) */}
            {!isOpen && (
              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={handleLogout}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  >
                    <LogOut size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
