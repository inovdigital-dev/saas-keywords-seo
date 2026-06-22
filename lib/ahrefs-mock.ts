// Mock Ahrefs API - simulates realistic search volume and difficulty data
// Later, this will be replaced with real Ahrefs API calls

import { KeywordData } from './claude'

const MIN_SEARCH_VOLUME = 100 // Mínimo para considerar uma keyword válida

export interface KeywordValidation extends KeywordData {
  score: number // 0-100, based on volume and difficulty
  isValid: boolean // true if volume >= MIN_SEARCH_VOLUME
}

// Validate keywords using mock Ahrefs data
export function validateKeywords(keywords: KeywordData[]): KeywordValidation[] {
  return keywords.map(kw => {
    const enriched = enrichWithAhrefsData(kw)
    const score = calculateQualityScore(enriched.searchVolume, enriched.difficulty)
    const isValid = enriched.searchVolume >= MIN_SEARCH_VOLUME

    return {
      ...enriched,
      score,
      isValid,
    }
  })
}

// Check if we have enough valid keywords
export function hasEnoughValidKeywords(validatedKeywords: KeywordValidation[]): boolean {
  const validCount = validatedKeywords.filter(k => k.isValid).length
  return validCount >= 5 // Need all 5 to be valid
}

// Get ranking of keywords by quality score
export function rankKeywordsByScore(
  validatedKeywords: KeywordValidation[]
): KeywordValidation[] {
  return [...validatedKeywords].sort((a, b) => b.score - a.score)
}

function enrichWithAhrefsData(keyword: KeywordData): KeywordData {
  return {
    keyword: keyword.keyword,
    searchVolume: calculateMockSearchVolume(keyword.keyword, keyword.searchVolume),
    difficulty: calculateMockDifficulty(keyword.keyword, keyword.difficulty),
  }
}

function calculateMockSearchVolume(keyword: string, estimatedVolume: number): number {
  // Add some randomization (±20%)
  const variance = 0.8 + Math.random() * 0.4
  const adjusted = Math.round(estimatedVolume * variance)

  // Apply realistic rules based on keyword characteristics
  if (keyword.length > 10) {
    return Math.round(adjusted * 0.6) // Longer keywords = fewer searches
  }
  if (keyword.toLowerCase().includes('how') || keyword.toLowerCase().includes('best')) {
    return Math.round(adjusted * 1.4) // Question keywords = more searches
  }
  if (keyword.toLowerCase().includes('buy') || keyword.toLowerCase().includes('cheap')) {
    return Math.round(adjusted * 0.8) // Commercial keywords = fewer but valuable
  }

  return adjusted
}

function calculateMockDifficulty(keyword: string, estimatedDifficulty: number): number {
  let difficulty = estimatedDifficulty

  // Single word keywords are usually harder to rank
  if (!keyword.includes(' ')) {
    difficulty = Math.min(100, difficulty + 20)
  }

  // Long-tail keywords (4+ words) are easier
  const wordCount = keyword.split(' ').length
  if (wordCount >= 4) {
    difficulty = Math.max(0, difficulty - 15)
  } else if (wordCount === 3) {
    difficulty = Math.max(0, difficulty - 8)
  }

  // Add small randomization (±3)
  const variance = -3 + Math.random() * 6
  return Math.max(0, Math.min(100, Math.round(difficulty + variance)))
}

function calculateQualityScore(searchVolume: number, difficulty: number): number {
  // Quality score formula: higher volume + lower difficulty = higher score
  // Score: 0-100

  // Normalize search volume (assume max useful is 10000)
  const volumeScore = Math.min(100, (searchVolume / 10000) * 100)

  // Lower difficulty is better
  const difficultyScore = 100 - difficulty

  // Weighted average: 60% volume, 40% difficulty
  const score = volumeScore * 0.6 + difficultyScore * 0.4

  return Math.round(score)
}
