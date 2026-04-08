import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { entity_type } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch sync config
    const { data: config } = await supabase
      .from('bl_sync_config')
      .select('*')
      .eq('entity_type', entity_type)
      .single()

    if (!config?.sync_enabled || !config?.google_sheet_id || !config?.sheet_tab) {
      return new Response(JSON.stringify({ success: false, reason: 'not configured' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch Google Sheet as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${config.google_sheet_id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheet_tab)}`
    const csvResp = await fetch(csvUrl)
    const csvText = await csvResp.text()

    // Parse CSV
    const lines = csvText.split('\n')
    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1).filter(l => l.trim()).map(l => {
      const vals = parseCSVLine(l)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim() })
      return obj
    })

    let created = 0, updated = 0

    if (entity_type === 'requirement') {
      for (const row of rows) {
        const mapped = {
          ref_id: row['ID'] || '',
          phase: row['Phase'] || '',
          domain: row['Domain'] || '',
          requirement: row['Requirement'] || '',
          type: row['Type'] || '',
          priority: row['Priority'] || 'Medium',
          status: row['Status'] || 'Backlog',
          assigned_to: row['Assigned To'] || null,
          complexity: row['Complexity'] || 'M',
          dependencies: (row['Dependencies'] || '').split(',').map(s => s.trim()).filter(Boolean),
          acceptance_criteria: row['Acceptance Criteria'] || null,
          saas_tier_gate: row['SaaS Tier Gate'] || 'All Tiers',
          upgrade_feature: row['Upgrade Feature'] === 'Yes',
          notes: row['Notes'] || null,
          source: 'sync' as const,
        }
        if (!mapped.ref_id) continue

        const { data: existing } = await supabase
          .from('bl_requirements')
          .select('id')
          .eq('ref_id', mapped.ref_id)
          .single()

        if (existing) {
          await supabase.from('bl_requirements').update(mapped).eq('ref_id', mapped.ref_id)
          updated++
        } else {
          await supabase.from('bl_requirements').insert(mapped)
          created++
        }
      }
    } else if (entity_type === 'content_calendar') {
      for (const row of rows) {
        const dateVal = row['Date'] || ''
        const publishDate = dateVal.includes('/')
          ? new Date(dateVal).toISOString().split('T')[0]
          : dateVal

        const mapped = {
          week: parseInt(row['Week']) || 0,
          publish_date: publishDate,
          day: row['Day'] || '',
          channel: row['Channel'] || '',
          format: row['Format'] || '',
          pillar: row['Pillar'] || '',
          topic: row['Topic / Hook'] || row['Topic'] || '',
          key_message: row['Key Message'] || null,
          cta: row['CTA'] || null,
          script_draft: row['Script / Draft'] || null,
          status: row['Status'] || 'To Draft',
          performance: null,
          notes: row['Notes'] || null,
          source: 'sync' as const,
        }
        if (!mapped.topic) continue

        const { data: existing } = await supabase
          .from('bl_content_calendar')
          .select('id')
          .eq('publish_date', mapped.publish_date)
          .eq('pillar', mapped.pillar)
          .single()

        if (existing) {
          await supabase.from('bl_content_calendar').update(mapped).eq('id', existing.id)
          updated++
        } else {
          await supabase.from('bl_content_calendar').insert(mapped)
          created++
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from('bl_sync_config')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('entity_type', entity_type)

    return new Response(JSON.stringify({ success: true, created, updated }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
