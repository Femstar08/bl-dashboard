import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parseFeed } from './parse-feed.ts'
import { scoreArticle, mapCategoryBias } from './score.ts'

const FETCH_TIMEOUT_MS = 10_000
const BATCH_SIZE = 5

interface Source {
  id: string
  name: string
  url: string
  feed_type: string
  category_bias: string | null
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Optional: fetch a single source for testing
    let singleSourceId: string | null = null
    let dryRun = false
    try {
      const body = await req.json()
      singleSourceId = body.source_id ?? null
      dryRun = body.dry_run ?? false
    } catch {
      // No body or invalid JSON — fetch all sources
    }

    // 1. Get active sources
    let query = supabase.from('bb_news_sources').select('id, name, url, feed_type, category_bias').eq('is_active', true)
    if (singleSourceId) {
      query = query.eq('id', singleSourceId)
    }
    const { data: sources, error: srcErr } = await query
    if (srcErr || !sources) {
      return jsonResponse({ success: false, error: srcErr?.message ?? 'No sources found' }, 500)
    }

    // 2. Get all existing URLs for dedup (last 30 days to keep query fast)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existingRows } = await supabase
      .from('bb_incoming_articles')
      .select('original_url')
      .gte('fetched_at', thirtyDaysAgo)
    const existingUrls = new Set((existingRows ?? []).map(r => r.original_url))

    // 3. Process sources in batches
    let totalInserted = 0
    let totalErrors = 0
    const logEntries: Array<{
      source_id: string
      success: boolean
      articles_found: number
      articles_inserted: number
      error_message: string | null
    }> = []

    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(source => fetchSource(source, existingUrls)))

      for (let j = 0; j < batch.length; j++) {
        const source = batch[j]
        const result = results[j]

        if (result.status === 'fulfilled') {
          const { items, newItems } = result.value

          if (!dryRun && newItems.length > 0) {
            const rows = newItems.map(item => ({
              source_id: source.id,
              original_title: item.title,
              original_url: item.link,
              original_excerpt: item.excerpt || null,
              fetched_at: new Date().toISOString(),
              status: 'Fetched',
              category_guess: mapCategoryBias(source.category_bias),
              created_at: new Date().toISOString(),
            }))

            const { error: insertErr } = await supabase.from('bb_incoming_articles').insert(rows)
            if (insertErr) {
              logEntries.push({
                source_id: source.id,
                success: false,
                articles_found: items.length,
                articles_inserted: 0,
                error_message: `Insert failed: ${insertErr.message}`,
              })
              totalErrors++
              continue
            }

            // Mark URLs as seen for subsequent batches
            for (const item of newItems) {
              existingUrls.add(item.link)
            }
          }

          const inserted = dryRun ? 0 : newItems.length
          totalInserted += inserted

          logEntries.push({
            source_id: source.id,
            success: true,
            articles_found: items.length,
            articles_inserted: inserted,
            error_message: null,
          })

          // Update source's updated_at
          if (!dryRun) {
            await supabase
              .from('bb_news_sources')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', source.id)
          }
        } else {
          logEntries.push({
            source_id: source.id,
            success: false,
            articles_found: 0,
            articles_inserted: 0,
            error_message: result.reason?.message ?? String(result.reason),
          })
          totalErrors++
        }
      }
    }

    // 4. Write fetch log
    if (!dryRun && logEntries.length > 0) {
      await supabase.from('bb_fetch_log').insert(logEntries)
    }

    return jsonResponse({
      success: true,
      dry_run: dryRun,
      sources_fetched: sources.length,
      articles_inserted: totalInserted,
      errors: totalErrors,
      details: logEntries.map(e => ({
        source_id: e.source_id,
        success: e.success,
        found: e.articles_found,
        inserted: e.articles_inserted,
        error: e.error_message,
      })),
    })
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) }, 500)
  }
})

interface FetchResult {
  items: Array<{ title: string; link: string; excerpt: string }>
  newItems: Array<{ title: string; link: string; excerpt: string; score: number }>
}

async function fetchSource(source: Source, existingUrls: Set<string>): Promise<FetchResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const resp = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BeaconLedger-RSS/1.0' },
    })
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} from ${source.name}`)
    }

    const xml = await resp.text()
    const items = parseFeed(xml)

    // Deduplicate and score
    const newItems = items
      .filter(item => !existingUrls.has(item.link))
      .map(item => ({
        ...item,
        score: scoreArticle(item.title, item.excerpt, source.category_bias),
      }))

    return { items, newItems }
  } finally {
    clearTimeout(timeout)
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
