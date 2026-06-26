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

// Shared writing rules to keep generated copy natural, correct and durable.
const WRITING_RULES = `Regras de escrita (MUITO IMPORTANTE):
- Escreve em português europeu (pt-PT), natural, fluente e profissional.
- NÃO menciones números nem dados que mudam com o tempo: quantidade de produtos, contagens, preços, percentagens, stock, datas ou estatísticas. O catálogo de uma loja online é dinâmico e esses valores ficam errados ou desatualizados.
- Integra as keywords de forma NATURAL e gramaticalmente correta. As keywords podem vir em "formato de pesquisa" (ordem não natural, ex.: "iogurte proteína comprar"); reescreve-as de forma fluente, adaptando ordem das palavras, artigos, preposições e flexão. NUNCA insiras uma keyword tal e qual se isso quebrar a gramática ou soar estranho — o sentido e a fluência valem mais do que a correspondência exata.
- Garante concordância correta de número e género (singular/plural, masculino/feminino) em todo o texto.
- Usa artigos e contrações de preposições corretos e CONSISTENTES para nomes de marcas/lojas (escolhe uma forma e mantém-na, ex.: "a Auchan"/"na Auchan", nunca alternar para "no Auchan").
- Sem keyword stuffing, sem frases de enchimento e sem inventar factos que não estejam no conteúdo da página.`

// Generate intro text using top 2 keywords
export async function generateIntroText(
  topKeywords: KeywordData[],
  content: string
): Promise<string> {
  const keywordList = topKeywords.slice(0, 2).map(k => k.keyword).join(', ')

  const prompt = `Escreve um parágrafo de introdução otimizado para SEO, para o topo desta página, com base no conteúdo e nas keywords principais.

KEYWORDS a usar (de forma natural): ${keywordList}

CONTEÚDO DA PÁGINA:
${content.slice(0, 2000)}

${WRITING_RULES}

Requisitos:
- Entre 110 e 150 palavras.
- Inclui as duas keywords de forma natural e gramatical.
- Início forte, tom apelativo e profissional, bom para captar o clique na pesquisa.

Devolve APENAS o texto do parágrafo, sem markdown nem formatação extra.`

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

  const prompt = `Escreve um parágrafo de fecho otimizado para SEO, para o final desta página, com base no conteúdo e nas keywords.

KEYWORDS a usar (de forma natural): ${keywordList}

CONTEÚDO DA PÁGINA:
${content.slice(0, 2000)}

${WRITING_RULES}

Requisitos:
- Entre 100 e 130 palavras.
- Inclui pelo menos 2 das keywords de forma natural e gramatical.
- Inclui uma chamada à ação (call-to-action) e tom profissional.

Devolve APENAS o texto do parágrafo, sem markdown nem formatação extra.`

  const message = await client.messages.create({
    model: TEXT_MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
