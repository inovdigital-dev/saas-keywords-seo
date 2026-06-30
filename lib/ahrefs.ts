import { KeywordData } from './claude'

const AHREFS_API_KEY = process.env.AHREFS_API_KEY
const BASE_URL = 'https://api.ahrefs.com/v3/keywords-explorer/overview'
const MIN_SEARCH_VOLUME = 100

export interface KeywordValidation extends KeywordData {
  score: number
  isValid: boolean
}

// Validate a list of keywords against Ahrefs data for the given country.
// Falls back to mock data if AHREFS_API_KEY is not configured.
export async function validateKeywords(
  keywords: KeywordData[],
  country = 'pt'
): Promise<KeywordValidation[]> {
  if (!AHREFS_API_KEY) {
    console.warn('[Ahrefs] No API key — using mock data')
    return mockValidate(keywords)
  }

  const keywordList = keywords.map(k => k.keyword).join(',')
  const params = new URLSearchParams({
    select: 'keyword,volume,difficulty',
    country,
    keywords: keywordList,
  })

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${AHREFS_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ahrefs API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json() as { keywords?: Array<{ keyword: string; volume: number; difficulty: number }> }

  // Index results by keyword (lowercase) for fast lookup
  const ahrefsMap = new Map<string, { volume: number; difficulty: number }>()
  for (const kw of data.keywords ?? []) {
    ahrefsMap.set(kw.keyword.toLowerCase(), {
      volume: kw.volume ?? 0,
      difficulty: kw.difficulty ?? 50,
    })
  }

  return keywords.map(kw => {
    const real = ahrefsMap.get(kw.keyword.toLowerCase())
    const volume = real?.volume ?? 0
    const difficulty = real?.difficulty ?? 50
    return {
      keyword: kw.keyword,
      searchVolume: volume,
      difficulty,
      score: qualityScore(volume, difficulty),
      isValid: volume >= MIN_SEARCH_VOLUME,
    }
  })
}

export function hasEnoughValidKeywords(validated: KeywordValidation[]): boolean {
  return validated.filter(k => k.isValid).length >= 5
}

export function rankKeywordsByScore(validated: KeywordValidation[]): KeywordValidation[] {
  return [...validated].sort((a, b) => b.score - a.score)
}

function qualityScore(volume: number, difficulty: number): number {
  const volumeScore = Math.min(100, (volume / 10_000) * 100)
  const diffScore = 100 - difficulty
  return Math.round(volumeScore * 0.6 + diffScore * 0.4)
}

// ─── Mock fallback (used when no API key is configured) ──────────────────────

function mockValidate(keywords: KeywordData[]): KeywordValidation[] {
  return keywords.map(kw => {
    const variance = 0.8 + Math.random() * 0.4
    let volume = Math.round(kw.searchVolume * variance)
    if (kw.keyword.length > 10) volume = Math.round(volume * 0.6)

    let difficulty = kw.difficulty
    if (!kw.keyword.includes(' ')) difficulty = Math.min(100, difficulty + 20)
    const words = kw.keyword.split(' ').length
    if (words >= 4) difficulty = Math.max(0, difficulty - 15)
    else if (words === 3) difficulty = Math.max(0, difficulty - 8)
    difficulty = Math.max(0, Math.min(100, Math.round(difficulty + (-3 + Math.random() * 6))))

    return {
      keyword: kw.keyword,
      searchVolume: volume,
      difficulty,
      score: qualityScore(volume, difficulty),
      isValid: volume >= MIN_SEARCH_VOLUME,
    }
  })
}
