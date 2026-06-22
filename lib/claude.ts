import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Fast model for structured keyword extraction; quality model for prose.
const KEYWORDS_MODEL = 'claude-haiku-4-5-20251001'
const TEXT_MODEL = 'claude-sonnet-4-6'

export interface KeywordData {
  keyword: string
  searchVolume: number
  difficulty: number
}

// Strip markdown code fences the model may wrap JSON in.
function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  // Fall back to the first [...] block
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) return arrayMatch[0]
  return trimmed
}

// Generate initial 5 keywords for validation
export async function generateKeywordsForValidation(
  content: string,
  previousAttempts: string[] = []
): Promise<KeywordData[]> {
  const previousContext =
    previousAttempts.length > 0
      ? `\n\nPreviously tried keywords (avoid these): ${previousAttempts.join(', ')}`
      : ''

  const prompt = `Analyze the following webpage content and extract 5 relevant SEO keywords that would help rank this page in search engines.

WEBPAGE CONTENT:
${content}${previousContext}

Return ONLY a JSON array with this exact structure (no markdown, no extra text):
[
  {"keyword": "example keyword", "searchVolume": 1200, "difficulty": 45},
  {"keyword": "another keyword", "searchVolume": 800, "difficulty": 38}
]

Requirements:
- Each keyword should be 1-4 words
- searchVolume: estimated monthly searches (realistic number based on keyword)
- difficulty: estimated ranking difficulty 1-100
- Return exactly 5 keywords
- IMPORTANT: Return valid JSON only, no markdown code blocks
- Keywords in the same language as the page content
- Focus on keywords with potential high search volume (>= 100 searches/month)`

  const message = await client.messages.create({
    model: KEYWORDS_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const keywords = JSON.parse(extractJson(responseText))
    return Array.isArray(keywords) ? keywords.slice(0, 5) : []
  } catch (error) {
    console.error('Error parsing keywords JSON:', error, '\nRaw:', responseText)
    return []
  }
}

// Generate intro text using top 2 keywords
export async function generateIntroText(
  topKeywords: KeywordData[],
  content: string
): Promise<string> {
  const keywordList = topKeywords.slice(0, 2).map(k => k.keyword).join(', ')

  const prompt = `Based on the following webpage content and the main keywords, write a compelling 120-150 word SEO-optimized intro paragraph for the top of the page.

KEYWORDS (use these): ${keywordList}

WEBPAGE CONTENT:
${content.slice(0, 2000)}

Requirements:
- Exactly 120-150 words
- Natural language, not keyword-stuffed
- Include BOTH keywords naturally (at least once each)
- In Portuguese (português)
- Engaging and professional
- Start strong to capture attention
- Good for click-through from search results

Return ONLY the paragraph text, no markdown or extra formatting.`

  const message = await client.messages.create({
    model: TEXT_MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}

// Generate outro text using remaining 3 keywords
export async function generateOutroText(
  allKeywords: KeywordData[],
  content: string
): Promise<string> {
  const keywordList = allKeywords.slice(2, 5).map(k => k.keyword).join(', ')

  const prompt = `Based on the following webpage content and the main keywords, write a compelling 100-130 word SEO-optimized outro paragraph for the end of the page.

KEYWORDS (use these): ${keywordList}

WEBPAGE CONTENT:
${content.slice(0, 2000)}

Requirements:
- Exactly 100-130 words
- Natural language, not keyword-stuffed
- Include at least 2 of the keywords naturally
- In Portuguese (português)
- Encourage action/engagement (call-to-action)
- Professional tone
- Good for conversion and internal linking
- Summary of main points

Return ONLY the paragraph text, no markdown or extra formatting.`

  const message = await client.messages.create({
    model: TEXT_MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
