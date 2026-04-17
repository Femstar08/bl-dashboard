import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const PROFILE_SYSTEM: Record<string, string> = {
  femi: 'You are writing a LinkedIn post for Femi Dieni, an AI thought leader and consultant. Write in first person, professional yet conversational tone. Focus on AI insights, practical applications, and lessons. Do NOT mention Beacon & Ledger or any company affiliation.',
  bl_accountant: 'You are writing a LinkedIn post for Beacon & Ledger, a UK accounting practice. Target audience: UK accountants and practice owners. Focus on HMRC, MTD, compliance, and technology for practices. Professional, authoritative tone.',
  bl_sme: 'You are writing a LinkedIn post for Beacon & Ledger targeting UK SME business owners. Focus on practical financial clarity, cash flow, and compliance made simple. Empathetic, plain-language tone.',
}

const FRAMEWORK_INSTRUCTIONS: Record<string, string> = {
  auto: 'Choose the most engaging structure for this content.',
  slay: 'Use the SLAY framework: Start with a Story or bold hook, share a Lesson, give an Action step, end with a You question to drive comments.',
  pas: 'Use the PAS framework: Problem (name the pain), Agitate (make it vivid), Solution (the insight or fix).',
}

const anthropic = new Anthropic()

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { article_id, profile_target, previous_post, framework, different_angle } = await req.json()

    if (!article_id) return NextResponse.json({ error: 'article_id required' }, { status: 400 })

    const supabase = adminClient()
    const { data: article, error: fetchErr } = await supabase
      .from('bb_incoming_articles')
      .select('original_title, original_excerpt, ai_summary')
      .eq('id', article_id)
      .single()

    if (fetchErr || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const systemPrompt = PROFILE_SYSTEM[profile_target] ?? PROFILE_SYSTEM.femi
    const frameworkNote = FRAMEWORK_INSTRUCTIONS[framework] ?? FRAMEWORK_INSTRUCTIONS.auto
    const content = article.ai_summary || article.original_excerpt || ''

    const userPrompt = [
      `Write a LinkedIn post about this article.`,
      ``,
      `Title: ${article.original_title}`,
      content ? `Context: ${content}` : '',
      previous_post ? `Previous post (don't repeat the same angle): ${previous_post}` : '',
      different_angle ? `Take a contrarian or unexpected angle — challenge assumptions or highlight a non-obvious insight.` : '',
      ``,
      `Requirements:`,
      `- ${frameworkNote}`,
      `- Under 1300 characters`,
      `- Max 3 hashtags at the end`,
      `- 1–2 emojis max`,
      `- Write the post text only, no explanation`,
    ].filter(Boolean).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const draft = response.content.find(b => b.type === 'text')?.text

    if (!draft) return NextResponse.json({ error: 'No draft returned' }, { status: 500 })

    await supabase
      .from('bb_incoming_articles')
      .update({ ai_rewrite: draft, status: 'AI_Drafted', profile_target })
      .eq('id', article_id)

    return NextResponse.json({ draft })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
