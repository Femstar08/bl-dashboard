import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

const PROFILE_STYLE: Record<string, string> = {
  femi: 'modern, clean, professional tech aesthetic, deep blue and white tones, abstract digital or data-inspired imagery',
  bl_accountant: 'professional UK corporate aesthetic, clean and minimal, navy and gold tones, finance or business imagery',
  bl_sme: 'warm professional UK small business aesthetic, approachable, people-focused, muted greens and blues',
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { article_id, title, summary, profile_target } = await req.json()

    if (!article_id || !title) {
      return NextResponse.json({ error: 'article_id and title required' }, { status: 400 })
    }

    const style = PROFILE_STYLE[profile_target] ?? PROFILE_STYLE.femi
    const imagePrompt = `A professional LinkedIn post image for the topic: "${title}".${summary ? ` Context: ${summary}` : ''} Visual style: ${style}. No text, no words, no letters. Square composition (1:1). High quality, editorial look.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-image-generation',
      contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
      config: { responseModalities: ['IMAGE'] },
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData)

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json({ error: 'No image returned from Gemini' }, { status: 500 })
    }

    const mimeType = imagePart.inlineData.mimeType ?? 'image/png'
    const ext = mimeType.split('/')[1] ?? 'png'
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')

    const supabase = adminClient()
    const fileName = `article-images/${article_id}-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('content-images')
      .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true })

    if (uploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName)

    await supabase
      .from('bb_incoming_articles')
      .update({ generated_image_url: publicUrl })
      .eq('id', article_id)

    return NextResponse.json({ image_url: publicUrl, image_prompt: imagePrompt })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
