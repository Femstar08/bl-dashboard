# B&L Growth Dashboard

Internal growth tracker for Beacon & Ledger Consulting Ltd.

## What it tracks
- **Lead pipeline** — accountants and SMEs across 5 stages
- **Revenue targets** — consulting MRR vs target, SaaS ARR
- **30-day milestones** — marketing, platform, consulting tracks
- **Content queue** — Femi personal + B&L company page posts

## Data storage
Currently uses `localStorage` — data persists in your browser.
When ready to upgrade: swap `useLocalStorage` hook for Supabase client calls (you already have the project).

## Deploy to Vercel

### Option 1: Vercel CLI (fastest)
```bash
npm install -g vercel
cd bl-dashboard
npm install
vercel
```
Follow the prompts. Done.

### Option 2: GitHub + Vercel (recommended for ongoing use)
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import the repo
3. Framework: Next.js (auto-detected)
4. Deploy — takes ~2 minutes

## Run locally
```bash
npm install
npm run dev
# opens on http://localhost:3000
```

## Adding sections over time
Each section is a self-contained component in `app/page.tsx`.
To add a new section (e.g. investor tracker, budget tracker):
1. Add a new interface in `lib/types.ts`
2. Add default data in `lib/defaults.ts`
3. Build the component and add it to the page grid

## Upgrade to Supabase
When ready, replace `lib/useLocalStorage.ts` with Supabase queries.
Your existing Supabase project is already set up for B&L.
