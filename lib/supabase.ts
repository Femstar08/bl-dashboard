import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type NewsSource = {
  id: string
  name: string
  url: string
  feed_type: string
  fetch_frequency: string
  is_active: boolean
  category_bias: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type IncomingArticle = {
  id: string
  source_id: string | null
  original_title: string
  original_url: string
  original_excerpt: string | null
  fetched_at: string
  ai_summary: string | null
  ai_key_points: string[] | null
  ai_rewrite: string | null
  status: string
  profile_target: 'femi' | 'bl_accountant' | 'bl_sme' | null
  scheduled_at: string | null
  posted_at: string | null
  linkedin_post_id: string | null
  previous_post_context: string | null
  created_at: string
}
