# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat top-bar navigation with a collapsible sidebar, install shadcn/ui, and upgrade every page with a distinct PageHeader and clean component styling.

**Architecture:** New `Sidebar.tsx` replaces `Nav.tsx` and is rendered in `layout.tsx` beside `<main>`. A shared `PageHeader.tsx` component provides each page with a gradient identity banner. shadcn/ui primitives (Button, Badge, Card, Progress, Tooltip, Sheet, Separator) replace inline-styled elements throughout.

**Tech Stack:** Next.js 14 App Router · Tailwind CSS v3 · shadcn/ui · lucide-react (already installed) · TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/theme.tsx` | Also toggle `dark` CSS class alongside `data-theme` |
| Create | `lib/utils.ts` | shadcn `cn()` helper (created by shadcn init) |
| Create | `components/Sidebar.tsx` | Collapsible icon sidebar with groups + theme toggle |
| Delete | `components/Nav.tsx` | Replaced by Sidebar |
| Modify | `app/layout.tsx` | Side-by-side Sidebar + main layout |
| Create | `components/PageHeader.tsx` | Gradient banner with icon, title, subtitle, actions |
| Modify | `app/globals.css` | Add shadcn vars + shared card/hover Tailwind classes |
| Modify | `tailwind.config.js` | Add shadcn CSS variable colours |
| Modify | `app/page.tsx` | Dashboard — PageHeader + upgraded KPI/pipeline cards |
| Modify | `app/growth/page.tsx` | PageHeader + component upgrades |
| Modify | `app/content/page.tsx` | PageHeader + component upgrades |
| Modify | `app/prospects/page.tsx` | PageHeader + component upgrades |
| Modify | `app/requirements/page.tsx` | PageHeader + component upgrades |
| Modify | `app/analytics/page.tsx` | PageHeader + component upgrades |
| Modify | `app/angel/page.tsx` | PageHeader + component upgrades |
| Modify | `app/agents/page.tsx` | PageHeader + component upgrades |
| Modify | `app/health/page.tsx` | PageHeader + component upgrades |
| Modify | `app/audit/page.tsx` | PageHeader + component upgrades |

---

## Shared Replacement Patterns (reference for all page tasks)

When upgrading a page file, apply these mechanical replacements in addition to adding `PageHeader`:

**Buttons:**
```tsx
// Before
<button onClick={fn} style={{ background: 'var(--accent)', color: 'var(--bg-primary)', ... }}>Label</button>
// After — primary
<Button onClick={fn}>Label</Button>
// After — ghost/secondary
<Button variant="outline" onClick={fn}>Label</Button>
// After — destructive
<Button variant="destructive" size="sm" onClick={fn}>Delete</Button>
```

**Status badges:**
```tsx
// Before
<span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: color + '22', color }}>STATUS</span>
// After
<Badge style={{ background: color + '22', color, border: 'none' }}>STATUS</Badge>
```

**Content cards:**
```tsx
// Before
<div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
// After
<Card><CardContent className="p-6">
```

**Section wrappers (full-width sections):**
Keep as `<section>` — only wrap internal panels in `Card`.

---

## Task 1: Install shadcn/ui + add component primitives

**Files:**
- Create: `lib/utils.ts` (auto-generated)
- Create: `components/ui/` (auto-generated)
- Modify: `tailwind.config.js`
- Modify: `app/globals.css`
- Modify: `package.json`

- [ ] **Step 1: Run shadcn init**

```bash
cd /Users/femi/Projects/bl-dashboard
npx shadcn@latest init
```

Answer the prompts exactly as follows:
```
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Would you like to use CSS variables for colors? › yes
Are you using React Server Components? › yes
Where is your global CSS file? › app/globals.css
Where is your tailwind.config.js located? › tailwind.config.js
Configure the import alias for components: › @/components
Configure the import alias for utils: › @/lib/utils
```

- [ ] **Step 2: Install required components**

```bash
npx shadcn@latest add button badge card progress tooltip sheet separator dropdown-menu
```

Expected: each component creates a file in `components/ui/`.

- [ ] **Step 3: Verify lib/utils.ts was created**

```bash
cat lib/utils.ts
```

Expected output:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If missing, create it manually with the content above.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any import errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui with button, badge, card, progress, tooltip, sheet, separator, dropdown-menu"
git push
```

---

## Task 2: Align dark mode — ThemeProvider + globals.css

shadcn/ui components respond to the `dark` CSS class on `<html>`. The current codebase uses `data-theme="dark"`. Both must be set simultaneously.

**Files:**
- Modify: `lib/theme.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update ThemeProvider to set both data-theme and dark class**

Replace the entire `lib/theme.tsx` with:

```tsx
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('bl-theme') as string | null
    // Handle legacy 'system' value — treat as dark
    if (stored === 'light') {
      setThemeState('light')
    } else {
      setThemeState('dark')
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme, mounted])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('bl-theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

Note: `resolvedTheme` is removed since `system` is no longer supported. Any component that used `resolvedTheme` should use `theme` directly.

- [ ] **Step 2: Search for resolvedTheme usages and fix them**

```bash
grep -r "resolvedTheme" --include="*.tsx" --include="*.ts" .
```

If any files use `resolvedTheme`, change them to use `theme` from `useTheme()`.

- [ ] **Step 3: Add shadcn dark mode overrides to globals.css**

In `app/globals.css`, the shadcn init will have added a `:root` and `.dark` block. Verify the `.dark` block exists. If shadcn's vars conflict visually, the existing `[data-theme="dark"]` CSS vars take priority for our custom components since they are more specific. No change needed to existing var blocks.

Add at the bottom of `app/globals.css`:

```css
/* ── Shared component classes ─────────────��────────────── */
@layer components {
  .bl-card {
    @apply bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px];
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .bl-card:hover {
    @apply -translate-y-px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  [data-theme="dark"] .bl-card:hover {
    box-shadow: none;
    border-color: rgba(83,233,197,0.2);
  }
  .bl-page {
    @apply max-w-[1440px] mx-auto px-6 py-8 pb-20;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.tsx app/globals.css
git commit -m "feat: align dark mode — set both data-theme and dark class for shadcn compatibility"
git push
```

---

## Task 3: Build Sidebar.tsx

**Files:**
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Create components/Sidebar.tsx**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <TooltipProvider delayDuration={300}>
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
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
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
        <div className={cn('flex items-center gap-2 p-3', isOpen ? 'justify-between' : 'flex-col')}>
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
              <TooltipTrigger asChild>
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
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar component with grouped nav and theme toggle"
git push
```

---

## Task 4: Update layout.tsx — wire Sidebar, remove Nav

**Files:**
- Modify: `app/layout.tsx`
- Delete: `components/Nav.tsx`

- [ ] **Step 1: Update app/layout.tsx**

Replace the entire file with:

```tsx
import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'
import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: 'B&L Growth Dashboard',
  description: 'Beacon & Ledger — internal growth tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        <ThemeProvider>
          <AuthGuard>
            <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Note: `data-theme="dark"` is removed from `<html>` — `ThemeProvider` now sets it dynamically on mount.

- [ ] **Step 2: Delete Nav.tsx**

```bash
rm components/Nav.tsx
```

- [ ] **Step 3: Run dev server and verify sidebar appears**

```bash
npm run dev
```

Open http://localhost:3000. You should see the 52px icon sidebar on the left. Hovering it should expand it to 220px. All 10 pages should be reachable via sidebar links.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git rm components/Nav.tsx
git commit -m "feat: replace top Nav with collapsible Sidebar in root layout"
git push
```

---

## Task 5: Build PageHeader.tsx

**Files:**
- Create: `components/PageHeader.tsx`

- [ ] **Step 1: Create components/PageHeader.tsx**

```tsx
import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  gradientFrom: string
  gradientTo: string
  accentColor: string
  actions?: React.ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  accentColor,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className="mb-6 overflow-hidden rounded-xl"
      style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
            }}
          >
            <Icon size={20} style={{ color: accentColor }} />
          </div>
          <div>
            <h1
              className="m-0 text-[17px] font-extrabold leading-tight tracking-tight text-white"
              style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="m-0 mt-[2px] text-[11px] text-white/50">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/PageHeader.tsx
git commit -m "feat: add PageHeader shared component with gradient banner"
git push
```

---

## Task 6: Upgrade Dashboard page (app/page.tsx) — reference implementation

This is the reference task. The pattern established here is repeated in Tasks 7–16.

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add imports for new components**

At the top of `app/page.tsx`, add these imports after the existing imports:

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LayoutDashboard } from 'lucide-react'
```

- [ ] **Step 2: Replace the KpiBar mkCard function**

Find the `mkCard` function inside `KpiBar` and replace it:

```tsx
// Replace mkCard with:
const mkCard = (icon: string, badgeText: string, title: string, value: string | number) => (
  <Card className="bl-card cursor-default">
    <CardContent className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>{icon}</span>
        <Badge
          className="text-[10px] font-bold"
          style={{ background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none' }}
        >
          {badgeText}
        </Badge>
      </div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{title}</p>
      <p className="text-2xl font-extrabold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-manrope)' }}>{value}</p>
    </CardContent>
  </Card>
)
```

- [ ] **Step 3: Upgrade RevenueTracker cards**

Inside `RevenueTracker`, replace the outer `<section style={cardStyle}>` wrapper:

```tsx
// Replace:
<section style={cardStyle}>
// With:
<Card className="bl-card">
<CardContent className="p-6">
// And close with:
</CardContent>
</Card>
```

Replace the progress bar `<div>` elements with the shadcn `Progress` component:

```tsx
// Replace:
<div style={{ width: '100%', background: 'var(--bg-primary)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
  <div style={{ background: 'var(--accent)', height: '100%', width: `${pctConsulting}%`, transition: 'width 1s', borderRadius: 99 }} />
</div>
// With:
<Progress value={pctConsulting} className="h-2" />
```

- [ ] **Step 4: Upgrade Milestones card**

Inside `Milestones`, replace the outer `<section style={cardStyle}>` wrapper:

```tsx
// Replace:
<section style={cardStyle}>
// With:
<Card className="bl-card">
<CardContent className="p-6">
// Close with:
</CardContent>
</Card>
```

- [ ] **Step 5: Upgrade ContentQueue card**

Inside `ContentQueue`, replace the outer `<section style={cardStyle}>` wrapper with `<Card className="bl-card"><CardContent className="p-6">` / `</CardContent></Card>`.

Replace the "Add Post" button:
```tsx
// Replace:
<button onClick={() => setOpen(!open)} style={{ fontSize: 12, fontWeight: 700, ... }}>Add Post</button>
// With:
<Button variant="outline" size="sm" onClick={() => setOpen(!open)}>Add Post</Button>
```

- [ ] **Step 6: Replace inline Btn components with shadcn Button**

The file has a local `Btn` component. Replace its usages at call sites with `<Button>`:

```tsx
// ghost → outline
<Btn onClick={fn}>Cancel</Btn>  →  <Button variant="outline" size="sm" onClick={fn}>Cancel</Button>
// primary → default
<Btn variant="primary" onClick={fn}>Save</Btn>  →  <Button size="sm" onClick={fn}>Save</Button>
// danger → destructive
<Btn variant="danger" onClick={fn}>Delete</Btn>  →  <Button variant="destructive" size="sm" onClick={fn}>Delete</Button>
```

Then delete the local `Btn` function from the file.

- [ ] **Step 7: Add PageHeader to the Dashboard return**

Inside the `Dashboard` component's return, replace the opening `<div>` wrapper:

```tsx
// Replace:
return (
  <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px 80px' }}>
    <KpiBar ... />
// With:
return (
  <div className="bl-page">
    <PageHeader
      title="Dashboard"
      subtitle={`${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · B&L Growth Overview`}
      icon={LayoutDashboard}
      gradientFrom="#0F1B35"
      gradientTo="#162240"
      accentColor="#53E9C5"
    />
    <KpiBar ... />
```

- [ ] **Step 8: Wrap LeadPanel in shadcn Sheet**

Open `components/LeadPanel.tsx`. Find the outermost fixed/absolute positioned container div (the slide-over backdrop + panel). Replace it so the panel is driven by shadcn `Sheet`:

```tsx
// Add at top of LeadPanel.tsx:
import { Sheet, SheetContent } from '@/components/ui/sheet'

// In the LeadPanel return, replace the outermost fixed overlay div structure with:
<Sheet open={true} onOpenChange={(open) => { if (!open) onClose() }}>
  <SheetContent
    side="right"
    className="w-[480px] max-w-full overflow-y-auto p-0"
    style={{ background: 'var(--bg-mid)', borderLeft: '1px solid var(--border)' }}
  >
    {/* existing panel content here, unchanged */}
  </SheetContent>
</Sheet>
```

Keep all existing internal content (form fields, buttons, sections) exactly as-is — only the outermost wrapper changes.

- [ ] **Step 9: Verify TypeScript compiles and app loads**

```bash
npx tsc --noEmit
npm run dev
```

Open http://localhost:3000. Verify: PageHeader gradient banner appears, KPI cards have the new card style, progress bars use the new Progress component, buttons are upgraded. Click a lead card — the slide-over should open from the right using the shadcn Sheet animation.

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx components/LeadPanel.tsx
git commit -m "feat: upgrade Dashboard page with PageHeader, shadcn cards, progress, and button components"
git push
```

---

## Task 7: Upgrade Growth page (app/growth/page.tsx)

**Files:**
- Modify: `app/growth/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader at the top of the page return**

Find the root return statement and add `PageHeader` as the first child inside the page wrapper div:

```tsx
<PageHeader
  title="Growth"
  subtitle="Outreach tracking and weekly activity"
  icon={TrendingUp}
  gradientFrom="#064E3B"
  gradientTo="#065F46"
  accentColor="#34D399"
/>
```

- [ ] **Step 3: Apply shared replacement patterns**

Follow the patterns from the "Shared Replacement Patterns" section at the top of this plan:
- Replace `style={cardStyle}` or equivalent inline card divs with `<Card className="bl-card"><CardContent className="p-6">`
- Replace inline `<button>` elements with `<Button>` from shadcn
- Replace inline status span tags with `<Badge>`

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit
git add app/growth/page.tsx
git commit -m "feat: upgrade Growth page with PageHeader and shadcn components"
git push
```

---

## Task 8: Upgrade Content page (app/content/page.tsx)

**Files:**
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PenLine } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader at the top of the page return**

```tsx
<PageHeader
  title="Content Calendar"
  subtitle="Schedule, draft, and publish content across channels"
  icon={PenLine}
  gradientFrom="#4C1D95"
  gradientTo="#5B21B6"
  accentColor="#A78BFA"
/>
```

- [ ] **Step 3: Apply shared replacement patterns**

Replace card wrappers, buttons, and status badges as per the patterns in the plan header.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit
git add app/content/page.tsx
git commit -m "feat: upgrade Content page with PageHeader and shadcn components"
git push
```

---

## Task 9: Upgrade Prospects page (app/prospects/page.tsx)

**Files:**
- Modify: `app/prospects/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Prospects"
  subtitle="LinkedIn lead sourcing and outreach pipeline"
  icon={Users}
  gradientFrom="#1E3A5F"
  gradientTo="#1E40AF"
  accentColor="#60A5FA"
/>
```

- [ ] **Step 3: Apply shared replacement patterns and commit**

```bash
npx tsc --noEmit
git add app/prospects/page.tsx
git commit -m "feat: upgrade Prospects page with PageHeader and shadcn components"
git push
```

---

## Task 10: Upgrade Requirements page (app/requirements/page.tsx)

**Files:**
- Modify: `app/requirements/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { List } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Requirements"
  subtitle="Roadmap, milestones, and project tracking"
  icon={List}
  gradientFrom="#1C1917"
  gradientTo="#292524"
  accentColor="#D4A574"
/>
```

- [ ] **Step 3: Apply shared replacement patterns and commit**

```bash
npx tsc --noEmit
git add app/requirements/page.tsx components/requirements/
git commit -m "feat: upgrade Requirements page with PageHeader and shadcn components"
git push
```

---

## Task 11: Upgrade Analytics page (app/analytics/page.tsx)

**Files:**
- Modify: `app/analytics/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Analytics"
  subtitle="Content performance, outreach stats, and growth metrics"
  icon={BarChart2}
  gradientFrom="#0C4A6E"
  gradientTo="#0369A1"
  accentColor="#38BDF8"
/>
```

- [ ] **Step 3: Apply shared replacement patterns and commit**

```bash
npx tsc --noEmit
git add app/analytics/page.tsx
git commit -m "feat: upgrade Analytics page with PageHeader and shadcn components"
git push
```

---

## Task 12: Upgrade Angel page (app/angel/page.tsx)

**Files:**
- Modify: `app/angel/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Smile } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Angel"
  subtitle="Investor pipeline and relationship tracking"
  icon={Smile}
  gradientFrom="#701A75"
  gradientTo="#86198F"
  accentColor="#E879F9"
/>
```

- [ ] **Step 3: Apply shared replacement patterns and commit**

```bash
npx tsc --noEmit
git add app/angel/page.tsx
git commit -m "feat: upgrade Angel page with PageHeader and shadcn components"
git push
```

---

## Task 13: Upgrade Agents page (app/agents/page.tsx)

**Files:**
- Modify: `app/agents/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Bot } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Agents"
  subtitle="AI agent task board and sprint management"
  icon={Bot}
  gradientFrom="#0F1B35"
  gradientTo="#162240"
  accentColor="#7C8CF8"
/>
```

- [ ] **Step 3: Replace local input/button styles**

`app/agents/page.tsx` defines a local `input` CSSProperties const. Replace inline `style={input}` usages on `<input>` elements with Tailwind classes:

```tsx
// Replace: <input style={input} ... />
// With:
<input
  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none font-[inherit]"
  ...
/>
```

- [ ] **Step 4: Apply shared button/badge/card patterns and commit**

```bash
npx tsc --noEmit
git add app/agents/page.tsx
git commit -m "feat: upgrade Agents page with PageHeader and shadcn components"
git push
```

---

## Task 14: Upgrade Health page (app/health/page.tsx)

**Files:**
- Modify: `app/health/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ActivityIcon } from 'lucide-react'
```

Note: `Activity` is already imported in health/page.tsx as `Activity`. Use that existing import; alias if needed:
```tsx
import { Activity as ActivityIcon } from 'lucide-react'
// then use ActivityIcon in PageHeader
```

Or simply reuse `Activity`:
```tsx
import PageHeader from '@/components/PageHeader'
// Activity already imported — pass it directly
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="System Health"
  subtitle="n8n workflow status and error monitoring"
  icon={Activity}
  gradientFrom="#7F1D1D"
  gradientTo="#991B1B"
  accentColor="#F87171"
/>
```

- [ ] **Step 3: Apply shared patterns and commit**

```bash
npx tsc --noEmit
git add app/health/page.tsx
git commit -m "feat: upgrade Health page with PageHeader and shadcn components"
git push
```

---

## Task 15: Upgrade Audit page (app/audit/page.tsx)

**Files:**
- Modify: `app/audit/page.tsx`

- [ ] **Step 1: Add imports**

```tsx
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'
```

- [ ] **Step 2: Add PageHeader**

```tsx
<PageHeader
  title="Audit Log"
  subtitle="Agent activity history and task execution records"
  icon={FileText}
  gradientFrom="#1C1917"
  gradientTo="#292524"
  accentColor="#FB923C"
/>
```

- [ ] **Step 3: Apply shared patterns and commit**

```bash
npx tsc --noEmit
git add app/audit/page.tsx
git commit -m "feat: upgrade Audit page with PageHeader and shadcn components"
git push
```

---

## Task 16: Final pass — TypeScript clean-up + done criteria check

**Files:**
- Any file with remaining type errors

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Fix every error. Common issues:
- `resolvedTheme` references — replace with `theme` from `useTheme()`
- `Theme` type now `'light' | 'dark'` — fix any code that passes `'system'`
- Missing `ReactNode` import — add `import { type ReactNode } from 'react'`
- shadcn component prop mismatches — check the component file in `components/ui/`

- [ ] **Step 2: Verify done criteria**

```bash
# Nav.tsx is gone
test ! -f components/Nav.tsx && echo "✓ Nav.tsx deleted" || echo "✗ Nav.tsx still exists"

# All 10 pages have PageHeader import
grep -l "PageHeader" app/page.tsx app/growth/page.tsx app/content/page.tsx app/prospects/page.tsx \
  app/requirements/page.tsx app/analytics/page.tsx app/angel/page.tsx \
  app/agents/page.tsx app/health/page.tsx app/audit/page.tsx | wc -l
# Expected: 10
```

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, open http://localhost:3000. Verify:
- Sidebar collapses to 52px icon rail, expands on hover
- Tooltips appear on collapsed icon hover
- Theme toggle in sidebar footer switches dark/light on all pages
- Every page shows its gradient PageHeader banner
- No flash of unstyled content on page load

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: dashboard redesign complete — sidebar, PageHeader, shadcn/ui components across all pages"
git push
```
