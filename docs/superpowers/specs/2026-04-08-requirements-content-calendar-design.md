# Requirements Page & Content Calendar — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Source data:** `beacon-requirements.xlsx` (4 tabs: Requirements, Phase Summary, Dashboard, Content Calendar)

---

## Overview

Add a **Requirements page** (`/requirements`) and a **Content Calendar tab** (within existing `/content` page) to the B&L Growth Dashboard. Both support CRUD, threaded comments, multiple view modes, Google Sheets real-time sync, Excel upload, and export to Excel/CSV/PDF.

---

## 1. Database Schema

### 1.1 `bl_requirements`

| Column              | Type         | Notes                                              |
|---------------------|--------------|-----------------------------------------------------|
| id                  | uuid (PK)    | Auto-generated                                      |
| ref_id              | text (unique)| Human-readable ID, e.g. "R001"                      |
| phase               | text         | "Phase 0", "Phase 1", etc.                          |
| domain              | text         | Identity, Compliance, UI, Commercial, etc.          |
| requirement         | text         | Description                                         |
| type                | text         | Database, UI, Workflow, Security, Template, Integration |
| priority            | text         | Critical, High, Medium, Low                         |
| status              | text         | Backlog, Ready, In Progress, Review, Done, Blocked  |
| assigned_to         | text         | Who's responsible                                   |
| complexity          | text         | S, M, L, XL                                        |
| dependencies        | text[]       | Array of ref_ids, e.g. `["R001", "R011"]`           |
| acceptance_criteria | text         | What "done" looks like                              |
| saas_tier_gate      | text         | All Tiers, Growth+, Scale+                          |
| upgrade_feature     | boolean      | Default false                                       |
| notes               | text         | Free-form                                           |
| source              | text         | "sync", "upload", "manual" — tracks edit origin     |
| created_at          | timestamptz  | Auto                                                |
| updated_at          | timestamptz  | Auto                                                |

### 1.2 `bl_phases`

| Column         | Type          | Notes                            |
|----------------|---------------|----------------------------------|
| id             | uuid (PK)     |                                  |
| phase          | text (unique) | "Phase 0", "Phase 1", etc.       |
| description    | text          |                                  |
| week_target    | text          | "Week 1-2", "NOW", etc.          |
| dependencies   | text          | Phase-level deps                 |
| total_reqs     | integer       |                                  |
| critical_count | integer       |                                  |
| gate_criteria  | text          | What must pass to exit this phase |

### 1.3 `bl_content_calendar`

| Column       | Type        | Notes                                      |
|--------------|-------------|---------------------------------------------|
| id           | uuid (PK)   |                                             |
| week         | integer     | Week number                                 |
| publish_date | date        | Target publish date                         |
| day          | text        | Monday, Wednesday, etc.                     |
| channel      | text        | LinkedIn Post, LinkedIn Video, etc.         |
| format       | text        | Text Post, Video Script, Carousel, etc.     |
| pillar       | text        | Compliance Made Simple, Behind the Practice, etc. |
| topic        | text        | Hook/headline                               |
| key_message  | text        | Core message                                |
| cta          | text        | Call to action                              |
| script_draft | text        | The actual draft content                    |
| status       | text        | To Draft, Drafting, Review, Scheduled, Published |
| performance  | jsonb       | { likes, comments, shares, impressions }    |
| notes        | text        |                                             |
| source       | text        | "sync", "upload", "manual"                  |
| created_at   | timestamptz |                                             |
| updated_at   | timestamptz |                                             |

### 1.4 `bl_comments`

Shared polymorphic comment table used by both Requirements and Content Calendar.

| Column      | Type             | Notes                                          |
|-------------|------------------|-------------------------------------------------|
| id          | uuid (PK)        |                                                 |
| entity_type | text             | "requirement" or "content_calendar"             |
| entity_id   | uuid             | FK to the parent item                           |
| parent_id   | uuid (nullable)  | FK to `bl_comments.id` for replies (null = top-level) |
| author      | text             | Who posted it                                   |
| body        | text             | Comment content (supports markdown)             |
| created_at  | timestamptz      |                                                 |
| updated_at  | timestamptz      |                                                 |

### 1.5 `bl_sync_config`

| Column         | Type        | Notes                            |
|----------------|-------------|----------------------------------|
| id             | uuid (PK)   |                                  |
| entity_type    | text        | "requirement" or "content_calendar" |
| google_sheet_id| text        | Sheet ID from URL                |
| sheet_tab      | text        | Which tab to sync                |
| last_synced_at | timestamptz |                                  |
| sync_enabled   | boolean     | Toggle on/off                    |

---

## 2. Requirements Page (`/requirements`)

### 2.1 Layout

**KPI strip** (top, auto-calculated):
- Total Requirements count
- By priority: Critical | High | Medium | Low — with counts
- By status: Backlog | Ready | In Progress | Review | Done | Blocked — with counts
- Upgrade vs All-Tier split

**Phase progress cards** (horizontal scrollable row):
- One card per phase: name, description, completion %, progress bar, critical count badge
- Click a phase card to filter all views below to that phase

**View toggle** — 4 icon buttons: Table | Kanban | Calendar | Dependencies

**Filter bar** — Multi-select dropdowns: Phase, Domain, Priority, Status, Assigned To, Complexity, SaaS Tier. Filters persist across view switches.

### 2.2 Table View

- Sortable columns for all fields
- Inline click-to-edit on: Status, Priority, Assigned To, Complexity
- Click a row to open **detail panel** (slide-in from right)
- Bulk select checkboxes + batch status update

### 2.3 Kanban View

- Columns: Backlog | Ready | In Progress | Review | Done | Blocked
- Cards show: ref_id, requirement title (truncated), priority badge, phase tag, complexity pill
- Drag-drop to change status
- Click card to open detail panel

### 2.4 Calendar View

- Monthly grid layout
- Requirements plotted by their phase's week_target (mapped to dates)
- Color-coded by phase
- Click an item to open detail panel

### 2.5 Dependency Map View

- React Flow interactive graph
- Nodes = requirements, colored by status, sized by complexity
- Edges = dependency arrows from `dependencies` field
- Hover: tooltip with ref_id, title, status
- Click: opens detail panel
- Zoom/pan, minimap in corner
- Critical path highlighting (longest dependency chain to any incomplete item)
- Respects active filters

### 2.6 Detail Panel

Slide-in panel from right (consistent with existing LeadPanel pattern):
- All fields as editable form inputs
- Status dropdown, priority dropdown, assigned_to text input, etc.
- Dependencies shown as clickable ref_id links
- **Comments thread** below form fields:
  - Top-level comments listed chronologically
  - Reply button on each comment for threaded replies (indented)
  - Markdown support in comment body
  - Author + timestamp on each comment
  - "Add a comment" input at bottom

### 2.7 CRUD

- **Create:** "Add Requirement" button opens detail panel with empty form
- **Edit:** Inline (table view) or detail panel (all views)
- **Delete:** Soft delete with confirmation dialog, accessible from detail panel

---

## 3. Content Calendar (new tab in `/content`)

### 3.1 Integration

5th tab in existing Content page, alongside: Sources, Queue, Studio, Scheduled, **Calendar**.

### 3.2 Layout

**KPI strip** (top):
- Total posts, By status: To Draft | Drafting | Review | Scheduled | Published — with counts
- This week's posts count, Overdue count
- Pillar breakdown badges

**View toggle** — 3 icon buttons: Table | Calendar | Kanban

**Filter bar** — Multi-select: Week, Pillar, Channel, Format, Status

### 3.3 Table View

- Sortable columns: Week, Date, Day, Channel, Format, Pillar, Topic, Status
- Inline click-to-edit on Status
- Click row to open detail panel

### 3.4 Calendar View

- Monthly grid
- Posts plotted on publish_date
- Each post shows: pillar color dot, topic (truncated), format icon (text vs video)
- Drag a post to a different date to reschedule
- Click a post to open detail panel

### 3.5 Kanban View

- Columns: To Draft | Drafting | Review | Scheduled | Published
- Cards show: date, pillar badge, topic (truncated), format icon, channel
- Drag-drop to change status
- Click card to open detail panel

### 3.6 Drafting Workflow

**Inline drafting** (in detail panel):
- Script/Draft field as rich textarea
- Edit topic, key_message, CTA, notes directly
- Change status as you progress

**"Open in Studio" button** (in detail panel):
- Switches to Studio tab
- Pre-fills: Topic as article context, Key Message as prompt seed, CTA preserved
- Uses existing AI draft generation + image generation N8N webhooks
- On save in Studio, links back to calendar item and updates status

### 3.7 Detail Panel

Same pattern as Requirements detail panel:
- All fields editable
- "Open in Studio" button
- Comments thread with threaded replies
- entity_type = "content_calendar"

### 3.8 CRUD

- **Create:** "Add Post" button opens detail panel with date picker
- **Edit:** Inline or detail panel
- **Delete:** Soft delete with confirmation

---

## 4. Upload & Sync

### 4.1 Excel Upload

- "Upload Plan" button on both Requirements and Content Calendar pages
- Accepts `.xlsx` files, parses client-side using SheetJS
- **Import preview screen** before committing:
  - Shows rows to be created (new) vs updated (matched by ref_id) vs skipped
  - Highlights validation issues (missing required fields, duplicate IDs)
  - Summary bar: New | Updated | Skipped | Warnings counts
- On confirm: **smart upsert** to Supabase — new items created, existing items updated. Requirements matched by `ref_id`; Content Calendar items matched by `publish_date` + `pillar` composite key
- Sets `source = "upload"` on affected rows
- **Upload history** logged: filename, timestamp, item counts, error counts

### 4.2 Google Sheets Sync

- **Settings panel** (gear icon on each page) to connect a Google Sheet:
  - Enter Google Sheet URL, extracts sheet ID
  - Select which tab to sync
  - Stores config in `bl_sync_config`
- **Supabase Edge Function** fetches the sheet on a **5-minute schedule** via `pg_cron`
  - Reads specified tab, maps columns to table fields
  - Upserts to `bl_requirements` or `bl_content_calendar`
  - Sets `source = "sync"` on affected rows
- **Google Apps Script** on the sheet side:
  - Fires a webhook to the Edge Function on cell change
  - Provides near real-time push updates
- **"Sync Now" button** for manual on-demand trigger
- **Last synced timestamp** displayed on page
- **On/off toggle** per entity type to enable/disable sync

### 4.3 Conflict Handling

- Google Sheet is **source of truth** when sync is active
- Dashboard edits are allowed and persist until next sync overwrites the same field
- **Edit source indicator** on each item: icon showing whether last updated via Google Sheet (green), Dashboard (purple), or Excel Upload (blue)

### 4.4 Initial Seed

- Import `beacon-requirements.xlsx` as seed data on first run
- Requirements tab (66 items) → `bl_requirements`
- Phase Summary tab (13 phases) → `bl_phases`
- Content Calendar tab (48 posts) → `bl_content_calendar`
- Dashboard tab → not stored (auto-calculated from live data)

---

## 5. Export & Download

### 5.1 Formats

Available on both Requirements and Content Calendar pages:
- **Excel (.xlsx)** — working data format
- **CSV** — universal flat format
- **PDF** — polished report for stakeholders

### 5.2 Export UX

- **Export button** visible on page (toolbar area)
- **Format picker dropdown**: single button with dropdown showing Excel, CSV, PDF options with icons and descriptions

### 5.3 Excel Export Details

- Respects active filters (exports only what's currently visible)
- Includes comments as an extra sheet/column

### 5.4 CSV Export Details

- Respects active filters
- Flat format, one row per item

### 5.5 PDF Report Sections

Generated client-side (or via Edge Function for heavier rendering):

1. **Cover page** — Title, date, B&L branding
2. **Executive summary** — KPI snapshot, priority breakdown, status breakdown
3. **Phase breakdown** — Progress per phase with gate criteria and progress bars
4. **Full item table** — All items (or filtered) with status, priority, assigned
5. **Comments** — Threaded comment history per item

### 5.6 Content Calendar PDF

Same structure adapted for content:
1. Cover page
2. Summary — post counts by status, pillar breakdown
3. Calendar view — month grid with posts
4. Post detail table
5. Comments

---

## 6. Shared Infrastructure

### 6.1 Comments System

- Single `bl_comments` table, polymorphic via `entity_type` + `entity_id`
- Supports threaded replies via `parent_id`
- Markdown rendering in comment body
- Used by both Requirements and Content Calendar detail panels

### 6.2 View Toggle Component

- Reusable icon-button toggle component
- Icons: grid (table), columns (kanban), calendar, network (dependencies)
- Tooltip on hover showing view name
- Persists selected view in local storage per page

### 6.3 Detail Panel Component

- Reusable slide-in panel from right
- Follows existing LeadPanel pattern from dashboard
- Configurable field list per entity type
- Comments thread built in

### 6.4 Filter Bar Component

- Reusable multi-select dropdown row
- Configurable filter fields per page
- Persists filter state across view switches
- Clear all button

---

## 7. Navigation

Add **Requirements** to the main Nav component:
- Position: after Prospects, before Analytics
- Route: `/requirements`

Content Calendar is a tab within existing `/content` — no new nav item needed.

---

## 8. Tech Decisions

| Decision | Choice | Reason |
|---|---|---|
| Excel parsing | SheetJS (xlsx) | Client-side, no server dependency, widely used |
| Dependency graph | React Flow | React-native, interactive, zoom/pan, fits existing stack |
| PDF generation | Client-side (jsPDF + autoTable) | No server infra needed, good enough for report-style output |
| Google Sheets sync | Supabase Edge Function | Stays in existing platform, no new infra |
| Real-time push | Google Apps Script webhook | Minimal extra work, fires on cell change |
| Comments | Polymorphic table | Single table, reusable across entities |
| Drag-drop | Native HTML5 DnD | Consistent with existing kanban pattern in dashboard |

---

## 9. Data from `beacon-requirements.xlsx`

### Requirements tab → `bl_requirements`
- 66 items, R001–R110
- Phases 0–12
- Domains: Identity, Client, Compliance, UI, Commercial, Workflow, Integration, Governance, Template
- All currently status: Backlog

### Phase Summary tab → `bl_phases`
- 13 phases (Phase 0 through Phase 12)
- Week targets from "NOW" through "Week 14-20"

### Content Calendar tab → `bl_content_calendar`
- 48 LinkedIn posts across 12 weeks
- 4 posts per week (Mon, Wed, Thu, Fri)
- 6 pillars: Compliance Made Simple, Behind the Practice, Tax & Deadline Alerts, Automation & Efficiency, Industry Insight, Client Wins
- 2 formats: Text Post, Video Script (60-90s)
- All currently status: To Draft

### Dashboard tab
- Not stored — auto-calculated from live `bl_requirements` data
