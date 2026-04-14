const PRIMARY_KEYWORDS = [
  'hmrc', 'mtd', 'making tax digital', 'companies house',
  'vat', 'corporation tax', 'self-assessment', 'self assessment',
  'acca', 'aat', 'xero', 'sage', 'bookkeeping', 'paye',
  'tax return', 'annual accounts', 'confirmation statement',
]

const SECONDARY_KEYWORDS = [
  'ai', 'artificial intelligence', 'automation', 'accounting',
  'fintech', 'compliance', 'small business', 'sme',
  'startup funding', 'angel invest', 'practice management',
  'accountant', 'audit', 'payroll',
]

const TERTIARY_KEYWORDS = [
  'uk business', 'regulation', 'digital transformation',
  'cloud accounting', 'financial reporting', 'business growth',
  'entrepreneur', 'freelance', 'sole trader', 'limited company',
]

const BIAS_DOMAINS = ['tax-accounting', 'companies-house', 'finance-funding']

/**
 * Score an article 0-10 for relevance to Beacon & Ledger's audience.
 */
export function scoreArticle(
  title: string,
  excerpt: string,
  categoryBias: string | null
): number {
  let score = 0
  const haystack = `${title} ${excerpt}`.toLowerCase()

  // Source-level bias boost
  if (categoryBias && BIAS_DOMAINS.includes(categoryBias)) {
    score += 4
  }

  // Primary keywords (+3, but only once)
  if (PRIMARY_KEYWORDS.some(kw => haystack.includes(kw))) {
    score += 3
  }

  // Secondary keywords (+2, but only once)
  if (SECONDARY_KEYWORDS.some(kw => haystack.includes(kw))) {
    score += 2
  }

  // Tertiary keywords (+1, but only once)
  if (TERTIARY_KEYWORDS.some(kw => haystack.includes(kw))) {
    score += 1
  }

  return Math.min(score, 10)
}

/**
 * Map a source's category_bias string to a valid article_category enum value.
 * Returns null if no mapping exists.
 *
 * Valid enum values: business-news, tax-accounting, companies-house, finance-funding, technology
 */
export function mapCategoryBias(bias: string | null): string | null {
  if (!bias) return null
  const valid = ['business-news', 'tax-accounting', 'companies-house', 'finance-funding', 'technology']
  if (valid.includes(bias)) return bias
  return null
}
