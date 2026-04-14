import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.4'

export interface FeedItem {
  title: string
  link: string
  excerpt: string
  publishedAt: string | null
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

/**
 * Parse an RSS 2.0 or Atom feed XML string into FeedItems.
 * Uses fast-xml-parser (Deno-compatible, no DOMParser needed).
 */
export function parseFeed(xml: string): FeedItem[] {
  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(xml)
  } catch {
    return []
  }

  // Try RSS 2.0: rss.channel.item
  const channel = (parsed as any)?.rss?.channel
  if (channel) {
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : []
    return parseRssItems(items)
  }

  // Try Atom: feed.entry
  const feed = (parsed as any)?.feed
  if (feed) {
    const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []
    return parseAtomEntries(entries)
  }

  return []
}

function str(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  // Some feeds wrap text in CDATA which fast-xml-parser returns as-is
  if (typeof val === 'object' && '#text' in (val as any)) return String((val as any)['#text']).trim()
  return ''
}

function parseRssItems(items: any[]): FeedItem[] {
  const results: FeedItem[] = []
  for (const item of items) {
    const title = str(item.title)
    const link = str(item.link)
    if (!title || !link) continue

    const excerpt = str(item.description)
    const pubDate = str(item.pubDate)

    results.push({
      title,
      link,
      excerpt: excerpt.slice(0, 500),
      publishedAt: pubDate || null,
    })
  }
  return results
}

function parseAtomEntries(entries: any[]): FeedItem[] {
  const results: FeedItem[] = []
  for (const entry of entries) {
    const title = str(entry.title)

    // Atom links: can be object with @_href or array of objects
    let link = ''
    if (Array.isArray(entry.link)) {
      const alt = entry.link.find((l: any) => l['@_rel'] === 'alternate') || entry.link[0]
      link = str(alt?.['@_href'])
    } else if (typeof entry.link === 'object') {
      link = str(entry.link['@_href'])
    } else {
      link = str(entry.link)
    }
    if (!title || !link) continue

    const excerpt = str(entry.summary) || str(entry.content)
    const published = str(entry.published) || str(entry.updated)

    results.push({
      title,
      link,
      excerpt: excerpt.slice(0, 500),
      publishedAt: published || null,
    })
  }
  return results
}
