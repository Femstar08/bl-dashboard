export interface FeedItem {
  title: string
  link: string
  excerpt: string
  publishedAt: string | null
}

/**
 * Parse an RSS 2.0 or Atom feed XML string into FeedItems.
 * Uses DOMParser (available in Deno).
 */
export function parseFeed(xml: string): FeedItem[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  if (!doc) return []

  // Check for parse error
  const parseError = doc.querySelector('parsererror')
  if (parseError) return []

  // Try RSS 2.0 first: <rss><channel><item>
  const rssItems = doc.querySelectorAll('channel > item')
  if (rssItems.length > 0) {
    return parseRssItems(rssItems)
  }

  // Try Atom: <feed><entry>
  const atomEntries = doc.querySelectorAll('feed > entry')
  if (atomEntries.length > 0) {
    return parseAtomEntries(atomEntries)
  }

  return []
}

function text(el: Element, tag: string): string {
  const child = el.querySelector(tag)
  return child?.textContent?.trim() ?? ''
}

function parseRssItems(items: NodeListOf<Element>): FeedItem[] {
  const results: FeedItem[] = []
  for (const item of items) {
    const title = text(item, 'title')
    const link = text(item, 'link')
    if (!title || !link) continue

    const excerpt = text(item, 'description')
    const pubDate = text(item, 'pubDate')

    results.push({
      title,
      link: link.trim(),
      excerpt: excerpt.slice(0, 500),
      publishedAt: pubDate || null,
    })
  }
  return results
}

function parseAtomEntries(entries: NodeListOf<Element>): FeedItem[] {
  const results: FeedItem[] = []
  for (const entry of entries) {
    const title = text(entry, 'title')

    // Atom links use <link rel="alternate" href="..."/>
    const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link')
    const link = linkEl?.getAttribute('href') ?? ''
    if (!title || !link) continue

    const excerpt = text(entry, 'summary') || text(entry, 'content')
    const published = text(entry, 'published') || text(entry, 'updated')

    results.push({
      title,
      link: link.trim(),
      excerpt: excerpt.slice(0, 500),
      publishedAt: published || null,
    })
  }
  return results
}
