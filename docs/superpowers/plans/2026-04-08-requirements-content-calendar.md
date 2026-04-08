# Requirements Page & Content Calendar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Requirements page (`/requirements`) with 4 view modes, a Content Calendar tab in the existing Content page with 3 view modes, threaded comments, Google Sheets sync, Excel upload, and PDF/Excel/CSV export.

**Architecture:** New page at `/app/requirements/page.tsx`, new Calendar tab in `/app/content/page.tsx`. Shared components for view toggles, filters, detail panels, and comments extracted to `/components/shared/`. Data in 5 new Supabase tables. Excel parsing client-side via SheetJS, dependency graph via React Flow, PDF via jsPDF.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Supabase (PostgreSQL), Tailwind CSS, lucide-react icons, SheetJS (xlsx), React Flow, jsPDF + jspdf-autotable

**Spec:** `docs/superpowers/specs/2026-04-08-requirements-content-calendar-design.md`

---

## File Structure

### New Files

```
lib/
  types-requirements.ts          — Requirement, Phase, ContentCalendarItem, Comment, SyncConfig types
  seed-data.ts                   — Parsed seed data from beacon-requirements.xlsx

components/shared/
  ViewToggle.tsx                 — Icon-button view switcher (table/kanban/calendar/deps)
  FilterBar.tsx                  — Multi-select dropdown filter row
  DetailPanel.tsx                — Slide-in panel shell (wraps entity-specific forms)
  CommentThread.tsx              — Threaded comments with replies
  KpiBar.tsx                     — Horizontal KPI strip with stat cards
  ExportButton.tsx               — Export dropdown (Excel/CSV/PDF)
  UploadButton.tsx               — Excel upload with preview modal

components/requirements/
  RequirementsTable.tsx          — Sortable table with inline edit
  RequirementsKanban.tsx         — Status-column kanban with drag-drop
  RequirementsCalendar.tsx       — Monthly grid calendar view
  RequirementsDeps.tsx           — React Flow dependency graph
  RequirementDetail.tsx          — Detail form for requirement fields
  PhaseCards.tsx                 — Horizontal scrollable phase progress

components/content-calendar/
  CalendarTable.tsx              — Sortable post table
  CalendarGrid.tsx               — Monthly grid with drag-to-reschedule
  CalendarKanban.tsx             — Status-column kanban
  CalendarDetail.tsx             — Detail form for content calendar fields

app/requirements/
  page.tsx                       — Requirements page (orchestrates views, data, state)

supabase/
  migrations/001_requirements_tables.sql — All 5 new tables
```

### Modified Files

```
components/Nav.tsx               — Add Requirements nav item
app/content/page.tsx             — Add Calendar tab
lib/supabase.ts                  — Add new type exports
package.json                     — Add xlsx, reactflow, jspdf, jspdf-autotable
```

---

## Task 1: Install Dependencies & Add Types

**Files:**
- Modify: `package.json`
- Create: `lib/types-requirements.ts`

- [ ] **Step 1: Install new packages**

```bash
npm install xlsx @xyflow/react jspdf jspdf-autotable
```

- [ ] **Step 2: Create types file**

Create `lib/types-requirements.ts`:

```typescript
export interface Requirement {
  id: string
  ref_id: string
  phase: string
  domain: string
  requirement: string
  type: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Backlog' | 'Ready' | 'In Progress' | 'Review' | 'Done' | 'Blocked'
  assigned_to: string | null
  complexity: 'S' | 'M' | 'L' | 'XL'
  dependencies: string[]
  acceptance_criteria: string | null
  saas_tier_gate: string
  upgrade_feature: boolean
  notes: string | null
  source: 'sync' | 'upload' | 'manual'
  created_at: string
  updated_at: string
}

export interface Phase {
  id: string
  phase: string
  description: string
  week_target: string
  dependencies: string | null
  total_reqs: number
  critical_count: number
  gate_criteria: string | null
}

export interface ContentCalendarItem {
  id: string
  week: number
  publish_date: string
  day: string
  channel: string
  format: string
  pillar: string
  topic: string
  key_message: string | null
  cta: string | null
  script_draft: string | null
  status: 'To Draft' | 'Drafting' | 'Review' | 'Scheduled' | 'Published'
  performance: { likes?: number; comments?: number; shares?: number; impressions?: number } | null
  notes: string | null
  source: 'sync' | 'upload' | 'manual'
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  entity_type: 'requirement' | 'content_calendar'
  entity_id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
  updated_at: string
}

export interface SyncConfig {
  id: string
  entity_type: 'requirement' | 'content_calendar'
  google_sheet_id: string | null
  sheet_tab: string | null
  last_synced_at: string | null
  sync_enabled: boolean
}

export const REQ_STATUSES = ['Backlog', 'Ready', 'In Progress', 'Review', 'Done', 'Blocked'] as const
export const REQ_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export const REQ_COMPLEXITIES = ['S', 'M', 'L', 'XL'] as const
export const CAL_STATUSES = ['To Draft', 'Drafting', 'Review', 'Scheduled', 'Published'] as const

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#F87171',
  High: '#F59E0B',
  Medium: '#7C8CF8',
  Low: '#8892a8',
}

export const STATUS_COLORS: Record<string, string> = {
  Backlog: '#8892a8',
  Ready: '#60a5fa',
  'In Progress': '#F59E0B',
  Review: '#7C8CF8',
  Done: '#34D399',
  Blocked: '#F87171',
}

export const CAL_STATUS_COLORS: Record<string, string> = {
  'To Draft': '#8892a8',
  Drafting: '#60a5fa',
  Review: '#F59E0B',
  Scheduled: '#7C8CF8',
  Published: '#34D399',
}

export const PILLAR_COLORS: Record<string, string> = {
  'Compliance Made Simple': '#53E9C5',
  'Behind the Practice': '#7C8CF8',
  'Tax & Deadline Alerts': '#F59E0B',
  'Automation & Efficiency': '#60a5fa',
  'Industry Insight': '#F87171',
  'Client Wins': '#34D399',
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json lib/types-requirements.ts
git commit -m "feat: add dependencies and types for requirements & content calendar"
```

---

## Task 2: Database Migration & Seed Data

**Files:**
- Create: `supabase/migrations/001_requirements_tables.sql`
- Create: `lib/seed-data.ts`

- [ ] **Step 1: Create SQL migration file**

Create `supabase/migrations/001_requirements_tables.sql`:

```sql
-- Requirements table
CREATE TABLE IF NOT EXISTS bl_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE NOT NULL,
  phase text NOT NULL,
  domain text NOT NULL,
  requirement text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Backlog',
  assigned_to text,
  complexity text DEFAULT 'M',
  dependencies text[] DEFAULT '{}',
  acceptance_criteria text,
  saas_tier_gate text DEFAULT 'All Tiers',
  upgrade_feature boolean DEFAULT false,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phases table
CREATE TABLE IF NOT EXISTS bl_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text UNIQUE NOT NULL,
  description text,
  week_target text,
  dependencies text,
  total_reqs integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  gate_criteria text
);

-- Content calendar table
CREATE TABLE IF NOT EXISTS bl_content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week integer NOT NULL,
  publish_date date NOT NULL,
  day text NOT NULL,
  channel text NOT NULL,
  format text NOT NULL,
  pillar text NOT NULL,
  topic text NOT NULL,
  key_message text,
  cta text,
  script_draft text,
  status text NOT NULL DEFAULT 'To Draft',
  performance jsonb,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments table (polymorphic)
CREATE TABLE IF NOT EXISTS bl_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_id uuid REFERENCES bl_comments(id),
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync config table
CREATE TABLE IF NOT EXISTS bl_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  google_sheet_id text,
  sheet_tab text,
  last_synced_at timestamptz,
  sync_enabled boolean DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bl_requirements_phase ON bl_requirements(phase);
CREATE INDEX IF NOT EXISTS idx_bl_requirements_status ON bl_requirements(status);
CREATE INDEX IF NOT EXISTS idx_bl_requirements_priority ON bl_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_bl_content_calendar_status ON bl_content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_bl_content_calendar_publish_date ON bl_content_calendar(publish_date);
CREATE INDEX IF NOT EXISTS idx_bl_comments_entity ON bl_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bl_comments_parent ON bl_comments(parent_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER trg_bl_requirements_updated
  BEFORE UPDATE ON bl_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bl_content_calendar_updated
  BEFORE UPDATE ON bl_content_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bl_comments_updated
  BEFORE UPDATE ON bl_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Run migration against Supabase**

Run the SQL in the Supabase dashboard SQL editor, or via CLI:

```bash
# If using Supabase CLI:
supabase db push
# Otherwise: paste the SQL into Supabase Dashboard > SQL Editor > Run
```

- [ ] **Step 3: Create seed data file**

Create `lib/seed-data.ts`. This file contains all 66 requirements, 13 phases, and 48 content calendar items parsed from the Excel file. The data is hardcoded so it can be imported without runtime Excel parsing.

The file exports three arrays:
- `SEED_REQUIREMENTS: Omit<Requirement, 'id' | 'created_at' | 'updated_at'>[]`
- `SEED_PHASES: Omit<Phase, 'id'>[]`
- `SEED_CONTENT_CALENDAR: Omit<ContentCalendarItem, 'id' | 'created_at' | 'updated_at'>[]`

Each array contains every row from the corresponding Excel tab, with fields mapped to the database column names. All requirements have `status: 'Backlog'` and `source: 'upload'`. All content calendar items have `status: 'To Draft'` and `source: 'upload'`.

**NOTE TO IMPLEMENTER:** Parse the file at `/Users/femi/Projects/bl-dashboard/beacon-requirements.xlsx` using the xlsx library to generate the full arrays. The Excel file has 4 tabs: Requirements (66 rows), Phase Summary (13 rows), Dashboard (skip — auto-calculated), Content Calendar (48 rows). Map columns as defined in the spec Section 1.

- [ ] **Step 4: Create seed script in requirements page**

Add a "Seed Data" button to the requirements page (Task 5) that:
1. Checks if `bl_requirements` is empty
2. If empty, inserts all seed data from `lib/seed-data.ts`
3. Shows a toast/alert on completion

This will be wired up in Task 5 when the page is built.

- [ ] **Step 5: Commit**

```bash
git add supabase/ lib/seed-data.ts
git commit -m "feat: add database migration and seed data for requirements & content calendar"
```

---

## Task 3: Shared Components — ViewToggle, KpiBar, FilterBar

**Files:**
- Create: `components/shared/ViewToggle.tsx`
- Create: `components/shared/KpiBar.tsx`
- Create: `components/shared/FilterBar.tsx`

- [ ] **Step 1: Create ViewToggle component**

Create `components/shared/ViewToggle.tsx`:

```tsx
'use client'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface ViewOption {
  key: string
  label: string
  icon: React.ReactNode
}

interface ViewToggleProps {
  views: ViewOption[]
  storageKey: string
  defaultView: string
  onViewChange: (view: string) => void
}

export default function ViewToggle({ views, storageKey, defaultView, onViewChange }: ViewToggleProps) {
  const [active, setActive] = useLocalStorage(storageKey, defaultView)

  function handleClick(key: string) {
    setActive(key)
    onViewChange(key)
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {views.map(v => (
        <button
          key={v.key}
          title={v.label}
          onClick={() => handleClick(v.key)}
          style={{
            padding: '7px 10px',
            borderRadius: 5,
            border: `1px solid ${active === v.key ? 'var(--accent)' : 'var(--border)'}`,
            background: active === v.key ? 'var(--accent)' : 'var(--bg-card)',
            color: active === v.key ? 'var(--bg-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {v.icon}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create KpiBar component**

Create `components/shared/KpiBar.tsx`:

```tsx
'use client'

interface KpiItem {
  label: string
  value: number | string
  color?: string
}

interface KpiBarProps {
  items: KpiItem[]
}

export default function KpiBar({ items }: KpiBarProps) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            padding: '8px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            flex: 1,
            minWidth: 80,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: item.color || 'var(--accent)' }}>{item.value}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create FilterBar component**

Create `components/shared/FilterBar.tsx`:

```tsx
'use client'
import { useState, useRef, useEffect } from 'react'

interface FilterDef {
  key: string
  label: string
  options: string[]
}

interface FilterBarProps {
  filters: FilterDef[]
  activeFilters: Record<string, string[]>
  onFilterChange: (key: string, values: string[]) => void
  onClearAll: () => void
}

export default function FilterBar({ filters, activeFilters, onFilterChange, onClearAll }: FilterBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasActive = Object.values(activeFilters).some(v => v.length > 0)

  return (
    <div ref={ref} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {filters.map(f => {
        const selected = activeFilters[f.key] || []
        const isOpen = openKey === f.key
        return (
          <div key={f.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenKey(isOpen ? null : f.key)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 12,
                background: selected.length > 0 ? 'var(--accent)' : 'var(--bg-card)',
                color: selected.length > 0 ? 'var(--bg-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f.label} {selected.length > 0 ? `(${selected.length})` : '▾'}
            </button>
            {isOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: 4, minWidth: 160, maxHeight: 220, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {f.options.map(opt => {
                  const active = selected.includes(opt)
                  return (
                    <div
                      key={opt}
                      onClick={() => {
                        const next = active ? selected.filter(s => s !== opt) : [...selected, opt]
                        onFilterChange(f.key, next)
                      }}
                      style={{
                        padding: '6px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? 'var(--bg-primary)' : 'var(--text-primary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {hasActive && (
        <button
          onClick={onClearAll}
          style={{
            padding: '4px 10px', fontSize: 10, borderRadius: 12,
            background: 'transparent', color: 'var(--text-muted)',
            border: '1px solid var(--border)', cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/shared/
git commit -m "feat: add shared ViewToggle, KpiBar, and FilterBar components"
```

---

## Task 4: Shared Components — CommentThread & DetailPanel

**Files:**
- Create: `components/shared/CommentThread.tsx`
- Create: `components/shared/DetailPanel.tsx`

- [ ] **Step 1: Create CommentThread component**

Create `components/shared/CommentThread.tsx`:

```tsx
'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/lib/types-requirements'

interface CommentThreadProps {
  entityType: 'requirement' | 'content_calendar'
  entityId: string
  comments: Comment[]
  onRefresh: () => void
}

export default function CommentThread({ entityType, entityId, comments, onRefresh }: CommentThreadProps) {
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const topLevel = comments.filter(c => !c.parent_id)
  const replies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  const submit = useCallback(async (text: string, parentId: string | null) => {
    if (!text.trim()) return
    await supabase.from('bl_comments').insert({
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parentId,
      author: 'Femi',
      body: text.trim(),
    })
    onRefresh()
  }, [entityType, entityId, onRefresh])

  async function handleSubmit() {
    await submit(body, null)
    setBody('')
  }

  async function handleReply(parentId: string) {
    await submit(replyBody, parentId)
    setReplyBody('')
    setReplyTo(null)
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const commentStyle = {
    padding: 8, background: 'var(--bg-mid)', borderRadius: 6, marginBottom: 6,
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Comments</div>
      {topLevel.map(c => (
        <div key={c.id}>
          <div style={commentStyle}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>{c.author}</div>
            <div style={{ fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{c.body}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                style={{ fontSize: 9, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reply
              </button>
            </div>
          </div>
          {replies(c.id).map(r => (
            <div key={r.id} style={{ ...commentStyle, marginLeft: 16, borderLeft: '2px solid var(--accent)', paddingLeft: 8, opacity: 0.9 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>{r.author}</div>
              <div style={{ fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{r.body}</div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{timeAgo(r.created_at)}</span>
            </div>
          ))}
          {replyTo === c.id && (
            <div style={{ marginLeft: 16, marginBottom: 8, display: 'flex', gap: 6 }}>
              <input
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReply(c.id)}
                placeholder="Reply..."
                style={{
                  flex: 1, padding: '6px 10px', fontSize: 11, background: 'var(--bg-mid)',
                  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={() => handleReply(c.id)}
                style={{
                  padding: '6px 12px', fontSize: 10, background: 'var(--accent)',
                  color: 'var(--bg-primary)', border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Add a comment..."
          style={{
            flex: 1, padding: '6px 10px', fontSize: 11, background: 'var(--bg-mid)',
            border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '6px 12px', fontSize: 10, background: 'var(--accent)',
            color: 'var(--bg-primary)', border: 'none', borderRadius: 6, cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create DetailPanel shell component**

Create `components/shared/DetailPanel.tsx`:

```tsx
'use client'
import { X } from 'lucide-react'

interface DetailPanelProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}

export default function DetailPanel({ title, onClose, children, width = 400 }: DetailPanelProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99,
        }}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, width, height: '100vh', zIndex: 100,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        overflowY: 'auto', padding: 20,
        animation: 'slideIn 0.2s ease-out',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/shared/CommentThread.tsx components/shared/DetailPanel.tsx
git commit -m "feat: add shared CommentThread and DetailPanel components"
```

---

## Task 5: Requirements Page — Table View (Core Page)

**Files:**
- Create: `app/requirements/page.tsx`
- Create: `components/requirements/RequirementsTable.tsx`
- Create: `components/requirements/RequirementDetail.tsx`
- Modify: `components/Nav.tsx`

This is the core page. It fetches data, manages state, and renders the table view as the default. Other views (kanban, calendar, deps) will be added in subsequent tasks.

- [ ] **Step 1: Add Requirements to Nav**

In `components/Nav.tsx`, add the Requirements item to NAV_ITEMS after Prospects:

```typescript
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
```

- [ ] **Step 2: Create RequirementDetail component**

Create `components/requirements/RequirementDetail.tsx`:

This component renders the full editable form for a single requirement inside a DetailPanel. Fields: ref_id (read-only), phase, domain, requirement, type, priority (dropdown), status (dropdown), assigned_to, complexity (dropdown), dependencies (comma-separated text input parsed to array), acceptance_criteria (textarea), saas_tier_gate, upgrade_feature (checkbox), notes (textarea). Below the form, render a CommentThread for entity_type "requirement".

Props:
```typescript
interface RequirementDetailProps {
  item: Requirement
  comments: Comment[]
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onRefreshComments: () => void
}
```

Each field renders as a labeled input. On blur or dropdown change, calls `onUpdate(item.id, { [field]: newValue })`. Delete button at bottom with confirmation.

- [ ] **Step 3: Create RequirementsTable component**

Create `components/requirements/RequirementsTable.tsx`:

Props:
```typescript
interface RequirementsTableProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
}
```

Renders a sortable table with columns: checkbox, ID, Phase, Requirement, Priority, Status, Complexity, Assigned. Clicking a row calls `onSelect`. Status and Priority cells are inline-editable dropdowns. Sort state managed with useState for sortKey and sortDir. Bulk select via checkbox column.

- [ ] **Step 4: Create the Requirements page**

Create `app/requirements/page.tsx`:

This is the main orchestrator. It:
1. Fetches `bl_requirements`, `bl_phases`, and `bl_comments` (where entity_type = 'requirement') from Supabase on mount
2. Manages state: items, phases, comments, activeFilters, selectedItem, selectedIds, currentView
3. Renders: KpiBar (computed from items), PhaseCards (Task 6), ViewToggle, FilterBar, and the active view component
4. Passes CRUD handlers that call Supabase and refresh state
5. Renders RequirementDetail in a DetailPanel when an item is selected
6. If items array is empty, shows a "Seed Data" button that inserts from seed-data.ts

Filter logic: items are filtered by activeFilters before being passed to view components. Filter options are derived from the data (unique values per field).

The page starts with table view only. Kanban/calendar/deps views will show a "Coming soon" placeholder until Tasks 6-8 are complete.

- [ ] **Step 5: Verify the page loads**

```bash
npm run dev
```

Open `http://localhost:3000/requirements`. Verify:
- Nav shows Requirements link
- Page loads with empty state or seed button
- After seeding, table shows 66 requirements
- KPI bar shows correct counts
- Filters work
- Clicking a row opens detail panel
- Editing fields saves to Supabase

- [ ] **Step 6: Commit**

```bash
git add app/requirements/ components/requirements/ components/Nav.tsx
git commit -m "feat: add Requirements page with table view, detail panel, and CRUD"
```

---

## Task 6: Requirements — PhaseCards & Kanban View

**Files:**
- Create: `components/requirements/PhaseCards.tsx`
- Create: `components/requirements/RequirementsKanban.tsx`
- Modify: `app/requirements/page.tsx`

- [ ] **Step 1: Create PhaseCards component**

Create `components/requirements/PhaseCards.tsx`:

Props:
```typescript
interface PhaseCardsProps {
  phases: Phase[]
  requirements: Requirement[]
  activePhase: string | null
  onPhaseClick: (phase: string | null) => void
}
```

Renders a horizontally scrollable row of cards. Each card shows: phase name, description, a progress bar (done/total for that phase), critical count badge. Clicking a card sets it as the active filter (clicking again deselects). Active card gets accent border.

- [ ] **Step 2: Create RequirementsKanban component**

Create `components/requirements/RequirementsKanban.tsx`:

Props:
```typescript
interface RequirementsKanbanProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
}
```

Renders 6 columns (Backlog, Ready, In Progress, Review, Done, Blocked). Each column header shows count. Cards show ref_id, title (truncated to 60 chars), priority badge, phase tag, complexity pill. Implements drag-drop using the same HTML5 pattern as the existing dashboard (onDragStart/onDragEnd/onDragOver/onDrop). Drop updates status via onUpdate.

- [ ] **Step 3: Wire into Requirements page**

Update `app/requirements/page.tsx`:
- Import PhaseCards, render below KPI bar
- Import RequirementsKanban, render when currentView === 'kanban'
- Replace "Coming soon" placeholder for kanban

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Test: toggle to kanban view, drag a card between columns, verify Supabase updates. Click phase cards, verify filtering works across both views.

- [ ] **Step 5: Commit**

```bash
git add components/requirements/PhaseCards.tsx components/requirements/RequirementsKanban.tsx app/requirements/page.tsx
git commit -m "feat: add phase progress cards and kanban view to Requirements page"
```

---

## Task 7: Requirements — Calendar View

**Files:**
- Create: `components/requirements/RequirementsCalendar.tsx`
- Modify: `app/requirements/page.tsx`

- [ ] **Step 1: Create RequirementsCalendar component**

Create `components/requirements/RequirementsCalendar.tsx`:

Props:
```typescript
interface RequirementsCalendarProps {
  items: Requirement[]
  phases: Phase[]
  onSelect: (item: Requirement) => void
}
```

Renders a monthly grid calendar. Maps requirements to dates based on their phase's week_target. Phase week targets like "Week 1-2" are mapped to date ranges relative to a configurable start date (default: 2026-04-06, the Monday of Week 1). Requirements for a phase are distributed across that phase's date range.

The grid has 7 columns (Mon-Sun), with cells for each day. Each cell shows requirement ref_ids as small colored pills (colored by phase). Clicking a pill opens the detail panel. Month navigation arrows at top.

- [ ] **Step 2: Wire into Requirements page**

Import RequirementsCalendar, render when currentView === 'calendar'.

- [ ] **Step 3: Verify and commit**

```bash
git add components/requirements/RequirementsCalendar.tsx app/requirements/page.tsx
git commit -m "feat: add calendar view to Requirements page"
```

---

## Task 8: Requirements — Dependency Map View

**Files:**
- Create: `components/requirements/RequirementsDeps.tsx`
- Modify: `app/requirements/page.tsx`

- [ ] **Step 1: Create RequirementsDeps component**

Create `components/requirements/RequirementsDeps.tsx`:

Props:
```typescript
interface RequirementsDepsProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
}
```

Uses `@xyflow/react` (React Flow v12). Builds nodes and edges from requirements:
- Each requirement with at least one dependency (or is depended upon) becomes a node
- Node label: ref_id. Node color based on status (STATUS_COLORS). Node width scales with complexity.
- Edges: for each requirement, draw an edge from each dependency ref_id to the requirement ref_id
- Layout: use a simple left-to-right layout by phase (Phase 0 items on the left, Phase 12 on the right). Within a phase, stack vertically.
- Critical path: compute the longest chain of incomplete (non-Done) items. Highlight those edges with accent color and dashed stroke.
- Minimap enabled. Zoom/pan via React Flow defaults.
- On node click: call onSelect with the corresponding requirement.

Wrap in `<ReactFlowProvider>` as required by the library.

- [ ] **Step 2: Wire into Requirements page**

Import RequirementsDeps, render when currentView === 'deps'.

- [ ] **Step 3: Verify and commit**

```bash
git add components/requirements/RequirementsDeps.tsx app/requirements/page.tsx
git commit -m "feat: add dependency map view to Requirements page"
```

---

## Task 9: Content Calendar Tab — Table & Detail

**Files:**
- Create: `components/content-calendar/CalendarTable.tsx`
- Create: `components/content-calendar/CalendarDetail.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Create CalendarDetail component**

Create `components/content-calendar/CalendarDetail.tsx`:

Props:
```typescript
interface CalendarDetailProps {
  item: ContentCalendarItem
  comments: Comment[]
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onRefreshComments: () => void
  onOpenInStudio: (item: ContentCalendarItem) => void
}
```

Form fields: publish_date (date input), day (auto from date), channel, format, pillar, topic, key_message (textarea), cta, script_draft (large textarea), status (dropdown), notes (textarea). "Open in Studio" button at bottom calls onOpenInStudio. CommentThread below.

- [ ] **Step 2: Create CalendarTable component**

Create `components/content-calendar/CalendarTable.tsx`:

Props:
```typescript
interface CalendarTableProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}
```

Sortable table: Week, Date, Day, Channel, Pillar (colored by PILLAR_COLORS), Topic, Status (inline dropdown). Click row to select.

- [ ] **Step 3: Add Calendar tab to Content page**

Modify `app/content/page.tsx`:
- Add 'Calendar' to the tab list (5th tab)
- When Calendar tab is active, fetch `bl_content_calendar` and `bl_comments` (entity_type = 'content_calendar') from Supabase
- Render KpiBar with post counts by status
- Render ViewToggle (table/calendar/kanban — start with table only, others in Tasks 10-11)
- Render FilterBar with Week, Pillar, Channel, Format, Status options
- Render CalendarTable as default view
- Render CalendarDetail in DetailPanel when item selected
- "Open in Studio" handler: switches to Studio tab, sets prefill state for topic/key_message/cta
- CRUD: Add Post button, delete in detail panel
- If content calendar is empty, show seed button

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Open Content page, click Calendar tab. Verify table loads with 48 posts after seeding. Test CRUD, filters, detail panel, Open in Studio.

- [ ] **Step 5: Commit**

```bash
git add components/content-calendar/ app/content/page.tsx
git commit -m "feat: add Content Calendar tab with table view and detail panel"
```

---

## Task 10: Content Calendar — Calendar Grid & Kanban Views

**Files:**
- Create: `components/content-calendar/CalendarGrid.tsx`
- Create: `components/content-calendar/CalendarKanban.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Create CalendarGrid component**

Create `components/content-calendar/CalendarGrid.tsx`:

Props:
```typescript
interface CalendarGridProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}
```

Monthly grid calendar. 7 columns (Mon-Sun). Posts plotted on their publish_date. Each post renders as a small pill with pillar color dot, topic (truncated), and format icon. Drag a post to a different date cell to reschedule (updates publish_date and day). Month navigation at top.

- [ ] **Step 2: Create CalendarKanban component**

Create `components/content-calendar/CalendarKanban.tsx`:

Props:
```typescript
interface CalendarKanbanProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}
```

5 columns: To Draft, Drafting, Review, Scheduled, Published. Cards show: date, pillar badge (PILLAR_COLORS), topic (truncated), format icon, channel. Drag-drop to change status. Same HTML5 DnD pattern.

- [ ] **Step 3: Wire into Content page**

Update the Calendar tab section in `app/content/page.tsx` to render CalendarGrid when view is 'calendar' and CalendarKanban when view is 'kanban'.

- [ ] **Step 4: Verify and commit**

```bash
git add components/content-calendar/CalendarGrid.tsx components/content-calendar/CalendarKanban.tsx app/content/page.tsx
git commit -m "feat: add calendar grid and kanban views to Content Calendar"
```

---

## Task 11: Excel Upload with Preview

**Files:**
- Create: `components/shared/UploadButton.tsx`
- Modify: `app/requirements/page.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Create UploadButton component**

Create `components/shared/UploadButton.tsx`:

Props:
```typescript
interface UploadButtonProps {
  entityType: 'requirement' | 'content_calendar'
  onImportComplete: () => void
}
```

This component:
1. Renders an "Upload Excel" button
2. On click, opens a hidden file input for `.xlsx`
3. On file select, parses with `import * as XLSX from 'xlsx'`
4. For requirements: maps columns (ID → ref_id, Phase → phase, etc.), validates required fields
5. For content calendar: maps columns (Week → week, Date → publish_date, etc.), validates required fields
6. Shows a modal with import preview:
   - Summary bar: New | Updated | Skipped | Warnings counts
   - Table showing each row with action (New/Update) and validation status
   - For requirements: matches existing by ref_id
   - For content calendar: matches existing by publish_date + pillar
7. On confirm: upserts to Supabase, sets source = 'upload'
8. On complete: calls onImportComplete to refresh parent data
9. Stores upload history in localStorage (filename, timestamp, counts)

- [ ] **Step 2: Add to Requirements page**

Import UploadButton, render in toolbar next to the Export button area on the Requirements page.

- [ ] **Step 3: Add to Content page Calendar tab**

Import UploadButton, render in the Calendar tab toolbar.

- [ ] **Step 4: Verify**

Upload `beacon-requirements.xlsx`. Verify preview shows 66 new items. Confirm import. Verify data appears in table.

- [ ] **Step 5: Commit**

```bash
git add components/shared/UploadButton.tsx app/requirements/page.tsx app/content/page.tsx
git commit -m "feat: add Excel upload with preview modal for requirements and content calendar"
```

---

## Task 12: Export — Excel, CSV, PDF

**Files:**
- Create: `components/shared/ExportButton.tsx`
- Modify: `app/requirements/page.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Create ExportButton component**

Create `components/shared/ExportButton.tsx`:

Props:
```typescript
interface ExportButtonProps {
  data: Record<string, any>[]
  columns: { key: string; label: string }[]
  filename: string
  title: string
  comments?: Comment[]
  phases?: Phase[]
  entityType: 'requirement' | 'content_calendar'
}
```

Renders an export button with dropdown (Excel, CSV, PDF). On click:

**Excel (.xlsx):**
- Uses XLSX library (already installed)
- Creates workbook with main data sheet + comments sheet
- `XLSX.writeFile(wb, filename + '.xlsx')`

**CSV:**
- Converts data array to CSV string with headers
- Creates blob and triggers download

**PDF:**
- Uses `jsPDF` + `jspdf-autotable`
- Page 1: Cover — title, date, "B&L Growth Dashboard" branding
- Page 2: Executive summary — counts by status and priority (for requirements) or status and pillar (for content calendar)
- Page 3+: Phase breakdown with progress bars (requirements only, using phases prop)
- Next pages: Full data table via autoTable
- Final pages: Comments grouped by entity ref_id/topic
- Saves as `filename.pdf`

- [ ] **Step 2: Add to Requirements page**

Import ExportButton, render in toolbar. Pass filtered items, column definitions, comments, phases.

- [ ] **Step 3: Add to Content page Calendar tab**

Import ExportButton, render in Calendar tab toolbar. Pass filtered items, column definitions, comments.

- [ ] **Step 4: Verify**

Test all 3 export formats on both pages. Verify Excel has comments sheet, CSV downloads, PDF has cover + summary + table + comments.

- [ ] **Step 5: Commit**

```bash
git add components/shared/ExportButton.tsx app/requirements/page.tsx app/content/page.tsx
git commit -m "feat: add Excel, CSV, and PDF export for requirements and content calendar"
```

---

## Task 13: Google Sheets Sync — Edge Function & Settings UI

**Files:**
- Create: `supabase/functions/sync-google-sheet/index.ts`
- Create: `components/shared/SyncSettings.tsx`
- Modify: `app/requirements/page.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Create Supabase Edge Function**

Create `supabase/functions/sync-google-sheet/index.ts`:

This Deno Edge Function:
1. Accepts POST with `{ entity_type, sheet_id?, tab? }` or is called via schedule
2. Reads `bl_sync_config` to get the Google Sheet ID and tab for the entity type
3. Fetches the Google Sheet as CSV via the public export URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}`
4. Parses CSV rows
5. For requirements: maps columns to bl_requirements fields, upserts by ref_id
6. For content_calendar: maps columns to bl_content_calendar fields, upserts by publish_date + pillar
7. Sets `source = 'sync'` on all affected rows
8. Updates `bl_sync_config.last_synced_at`
9. Returns `{ success: true, created: N, updated: N }`

**NOTE:** This approach uses the public CSV export URL, which works for Google Sheets that are shared as "Anyone with the link can view". No OAuth needed.

- [ ] **Step 2: Create SyncSettings component**

Create `components/shared/SyncSettings.tsx`:

Props:
```typescript
interface SyncSettingsProps {
  entityType: 'requirement' | 'content_calendar'
  onSyncComplete: () => void
}
```

Renders a gear icon button. On click, opens a small settings panel with:
- Google Sheet URL input (extracts sheet ID from URL)
- Tab name input
- Sync enabled toggle
- Last synced timestamp
- "Sync Now" button (calls the Edge Function)
- Save button (upserts bl_sync_config)

- [ ] **Step 3: Add to both pages**

Import SyncSettings, render in toolbar area on both Requirements page and Content Calendar tab.

- [ ] **Step 4: Create Google Apps Script**

Provide the Apps Script code as a comment in the SyncSettings component or in a separate doc. The script:

```javascript
function onEdit(e) {
  var url = 'YOUR_SUPABASE_EDGE_FUNCTION_URL';
  var payload = {
    entity_type: 'requirement', // or 'content_calendar' depending on sheet
    sheet_id: SpreadsheetApp.getActiveSpreadsheet().getId(),
    tab: e.source.getActiveSheet().getName()
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}
```

The user installs this in their Google Sheet via Extensions > Apps Script.

- [ ] **Step 5: Verify and commit**

```bash
git add supabase/functions/ components/shared/SyncSettings.tsx app/requirements/page.tsx app/content/page.tsx
git commit -m "feat: add Google Sheets sync via Supabase Edge Function with settings UI"
```

---

## Task 14: Final Integration & Polish

**Files:**
- Modify: `app/requirements/page.tsx`
- Modify: `app/content/page.tsx`

- [ ] **Step 1: Add edit source indicators**

In both RequirementsTable and CalendarTable, add a small icon next to each row indicating the source:
- Green document icon = synced from Google Sheet
- Purple pencil icon = edited in dashboard
- Blue upload icon = imported via Excel

Read from the `source` field on each item.

- [ ] **Step 2: Add bulk actions to Requirements table**

In RequirementsTable: when items are selected via checkboxes, show a toolbar with:
- "Update Status" dropdown → applies selected status to all checked items
- "Clear Selection" button
- Selected count indicator

- [ ] **Step 3: Ensure view toggle persists in localStorage**

Verify ViewToggle uses useLocalStorage so the selected view is remembered per page across page reloads.

- [ ] **Step 4: Full integration test**

Run through both pages end-to-end:
- Requirements: all 4 views, CRUD, comments, filters, phase cards, bulk actions, export, upload
- Content Calendar: all 3 views, CRUD, comments, filters, Open in Studio, export, upload
- Sync settings panel renders and saves config

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add source indicators, bulk actions, and polish requirements & content calendar"
```

---

## Parallel Execution Guide

Tasks that can run in parallel (after their dependencies):

| Group | Tasks | Dependencies |
|-------|-------|-------------|
| **Foundation** | Task 1, Task 2 | None (sequential — Task 2 depends on Task 1 types) |
| **Shared Components** | Task 3, Task 4 | Task 1 (types) |
| **Requirements Views** | Task 5, Task 6, Task 7, Task 8 | Tasks 1-4. Task 5 first (creates page), then 6/7/8 in parallel |
| **Content Calendar** | Task 9, Task 10 | Tasks 1-4. Task 9 first, then Task 10 |
| **Data Features** | Task 11, Task 12, Task 13 | Tasks 5, 9 (pages must exist). All 3 can run in parallel |
| **Polish** | Task 14 | All prior tasks |
