# Dashboard Redesign — Design Spec
**Date:** 2026-04-25  
**Status:** Approved

---

## Summary

A visual and structural overhaul of the B&L internal dashboard. The goal is to replace the flat, dull, top-bar navigation with a polished sidebar-driven layout that feels like a real product. No business logic changes — this is a pure UI layer upgrade.

---

## Decisions Made

| Question | Decision |
|---|---|
| Navigation pattern | Collapsible icon sidebar (52px collapsed, 220px expanded) |
| Visual style | Clean structured — white cards + subtle shadows (light), navy cards (dark) |
| Theme | User-toggleable dark/light, toggle lives in sidebar footer |
| Component library | shadcn/ui + Tailwind (already installed) |
| Migration strategy | Sidebar first → shared components → page headers → page-by-page content |

---

## Architecture

### Layout change

**Current:** `Nav.tsx` (top bar) + `<main>{children}</main>` inside `layout.tsx`

**New:**
```
RootLayout
  └── ThemeProvider
        └── AuthGuard
              └── div.flex  (full-height flex row)
                    ├── Sidebar.tsx        (new)
                    └── main.flex-1        (page content)
```

`Nav.tsx` is deleted. `layout.tsx` is updated to render the sidebar beside `<main>`.

### New shared components

#### `components/Sidebar.tsx`
- Collapsed: 52px icon rail
- Expanded: 220px with labelled groups, triggered by hover or a pin toggle
- Groups and pages:
  - **Overview:** Dashboard, Analytics
  - **Sales:** Growth, Prospects, Angel
  - **Content:** Content, Requirements
  - **System:** Agents, Health, Audit
- Active page highlighted with accent background + coloured icon
- Bottom footer: user avatar (initial), name + role label, theme toggle pill
- Theme toggle: compact sun/moon two-button pill (replaces current three-button sun/system/moon)
- Collapsed state shows icon-only with shadcn `Tooltip` on hover (name + group label)

#### `components/PageHeader.tsx`
Props: `title`, `subtitle`, `icon`, `gradientFrom`, `gradientTo`, `accentColor`, `actions`

Renders a dark gradient banner at the top of each page. Consistent structure, distinct identity per page via colour. Each page passes its own values:

| Page | Gradient | Accent |
|---|---|---|
| Dashboard | `#0F1B35 → #162240` | `#53E9C5` (teal) |
| Growth | `#064E3B → #065F46` | `#34D399` (green) |
| Prospects | `#1E3A5F → #1E40AF` | `#60A5FA` (blue) |
| Content | `#4C1D95 → #5B21B6` | `#A78BFA` (purple) |
| Requirements | `#1C1917 → #292524` | `#D4A574` (amber) |
| Analytics | `#0C4A6E → #0369A1` | `#38BDF8` (sky) |
| Angel | `#701A75 → #86198F` | `#E879F9` (fuchsia) |
| Agents | `#0F1B35 → #162240` | `#7C8CF8` (indigo) |
| Health | `#7F1D1D → #991B1B` | `#F87171` (red) |
| Audit | `#1C1917 → #292524` | `#FB923C` (orange) |

#### `components/ui/` — shadcn/ui primitives
Installed and used throughout:
- `Button` — replaces all inline-styled `<button>` elements
- `Badge` — lead status, content status, BL score tags, trend badges on KPI cards
- `Card`, `CardHeader`, `CardContent` — base for KPI cards, content cards, settings panels
- `Progress` — MRR target bars, milestone completion
- `Tooltip` — collapsed sidebar icon labels
- `Sheet` — wraps the existing `LeadPanel` component as the slide-over container. `LeadPanel` internal logic is unchanged; only its outermost wrapper becomes a `Sheet`.
- `Separator` — sidebar group dividers
- `DropdownMenu` — filter menus, view toggles where applicable

---

## Visual Design Tokens

### Light mode (unchanged CSS vars, now used via Tailwind)
```css
--bg-primary: #F4F6FB
--bg-mid:     #FFFFFF
--bg-card:    #FFFFFF
--text-primary: #0F1B35
--text-muted:   #5C6478
--border:       rgba(15,27,53,0.12)
--accent:       #0F6E56
```

### Dark mode
```css
--bg-primary: #0F1B35
--bg-mid:     #162240
--bg-card:    #1E2F52
--text-primary: #E8EDF5
--text-muted:   #8892A4
--border:       rgba(83,233,197,0.08)
--accent:       #53E9C5
```

### Card treatment
- **Light:** white background, `border: 1px solid #e8ecf2`, `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`, `border-radius: 10px`
- **Dark:** `#1E2F52` background, `border: 1px solid rgba(255,255,255,0.06)`, no shadow
- **Primary card (light):** teal-tinted border `rgba(15,110,86,0.15)`
- **Hover:** `translateY(-1px)` + shadow deepens (light), border brightens slightly (dark)

### KPI cards
- Icon top-left, trend badge top-right
- Large metric value (Manrope 800, 20–24px)
- Mini progress bar at bottom where a target exists
- Trend badge colours: green `#DCFCE7/#16A34A`, amber `#FEF3C7/#D97706`, blue `#EFF6FF/#3B82F6`, muted `#F3F4F6/#6B7280`

---

## Components Not Changing

- All Supabase data fetching logic
- All API routes (`/api/generate-draft`, `/api/generate-image`, `/api/xero/*`)
- All types and interfaces
- Existing `ThemeProvider` + `useTheme` hook (UI moves, logic stays)
- Auth flow (`AuthGuard`, login page)
- `lib/` utilities

---

## Migration Sequence

### Phase 1 — Infrastructure
1. Install shadcn/ui: `npx shadcn@latest init`
2. Add components: `button`, `badge`, `card`, `progress`, `tooltip`, `sheet`, `separator`, `dropdown-menu`
3. **Align dark mode strategy:** shadcn/ui requires a `dark` CSS class on `<html>`, but the current codebase uses `data-theme="dark"`. Update `ThemeProvider` to set both `data-theme` (for existing CSS vars) and the `dark` class (for shadcn components) simultaneously. Update `tailwind.config.js` `darkMode` to `"class"` — this is already set.
4. Configure Tailwind to recognise shadcn CSS variables alongside existing ones
5. Build `Sidebar.tsx`
6. Update `layout.tsx` — sidebar + main layout, delete `Nav.tsx`

### Phase 2 — Shared components
6. Build `PageHeader.tsx`
7. Update `globals.css` — card, hover, and focus styles as Tailwind `@layer components` classes

### Phase 3 — Page-by-page
8. `app/page.tsx` (Dashboard) — apply `PageHeader`, upgrade KPI cards, agent strip, pipeline cards
9. `app/growth/page.tsx`
10. `app/content/page.tsx`
11. `app/prospects/page.tsx`
12. `app/requirements/page.tsx`
13. `app/analytics/page.tsx`
14. `app/angel/page.tsx`
15. `app/agents/page.tsx`
16. `app/health/page.tsx`
17. `app/audit/page.tsx`

---

## What "Done" Looks Like

- Top `Nav.tsx` is gone; sidebar is the only navigation
- Every page has a `PageHeader` with a distinct gradient + accent
- All buttons, badges, cards use shadcn/ui components or the new Tailwind classes
- Dark/light toggle works from the sidebar footer
- No inline `style={{}}` objects remain in page files (shared components use them internally where needed)
- `npx tsc --noEmit` passes with zero errors
