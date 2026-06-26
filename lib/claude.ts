import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const KEYWORDS_MODEL = 'claude-haiku-4-5-20251001'
const TEXT_MODEL = 'claude-sonnet-4-6'

export interface KeywordData {
  keyword: string
  searchVolume: number
  difficulty: number
}

export interface KeywordMapping {
  original: string
  used: string
}

export interface TextResult {
  text: string
  mappings: KeywordMapping[]
}

// Strip markdown code fences the model may wrap JSON in.
function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) return arrayMatch[0]
  return trimmed
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const objMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objMatch) return objMatch[0]
  return trimmed
}

function parseTextResult(raw: string): TextResult {
  try {
    const json = extractJsonObject(raw)
    const parsed = JSON.parse(json)
    if (typeof parsed.text === 'string') {
      return {
        text: parsed.text.trim(),
        mappings: Array.isArray(parsed.mappings) ? parsed.mappings : [],
      }
    }
  } catch {
    // fallback: treat entire response as plain text, no mappings
  }
  return { text: raw.trim(), mappings: [] }
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
  content: string,
  toneOfVoice?: string | null,
  maxChars?: number | null
): Promise<TextResult> {
  const keywordList = topKeywords.slice(0, 2).map(k => k.keyword).join(', ')

  const toneSection = toneOfVoice?.trim()
    ? `\nTOM DE VOZ E BRIEFING DA MARCA (segue rigorosamente):\n${toneOfVoice.trim()}\n`
    : ''

  const lengthRule = maxChars && maxChars > 0
    ? `- LIMITE DE CARACTERES (CRÍTICO): O texto em "text" NÃO pode ultrapassar ${maxChars} caracteres no total (conta espaços, pontuação e qualquer caractere especial). Conta antes de responder.`
    : '- Entre 110 e 150 palavras.'

  const prompt = `Escreve um parágrafo de introdução otimizado para SEO, para o topo desta página, com base no conteúdo e nas keywords principais.

KEYWORDS a usar (de forma natural): ${keywordList}

CONTEÚDO DA PÁGINA:
${content.slice(0, 2000)}
${toneSection}
${WRITING_RULES}

Requisitos:
${lengthRule}
- Inclui as duas keywords de forma natural e gramatical. Se necessário adapta a keyword para ficar correta em português (ex.: muda a ordem, adiciona artigos/preposições).
- Início forte, tom apelativo e profissional.

Responde APENAS com um objeto JSON válido (sem markdown nem texto extra), com este formato exato:
{"text":"...","mappings":[{"original":"keyword original","used":"forma usada no texto"}]}

Inclui em "mappings" TODAS as keywords usadas — mesmo as que não foram adaptadas (põe original === used nesses casos).`

  const message = await client.messages.create({
    model: TEXT_MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseTextResult(raw)
}

// Generate outro text using remaining 3 keywords
export async function generateOutroText(
  allKeywords: KeywordData[],
  content: string,
  toneOfVoice?: string | null,
  maxChars?: number | null
): Promise<TextResult> {
  const keywordList = allKeywords.slice(2, 5).map(k => k.keyword).join(', ')

  const toneSection = toneOfVoice?.trim()
    ? `\nTOM DE VOZ E BRIEFING DA MARCA (segue rigorosamente):\n${toneOfVoice.trim()}\n`
    : ''

  const lengthRule = maxChars && maxChars > 0
    ? `- LIMITE DE CARACTERES (CRÍTICO): O texto em "text" NÃO pode ultrapassar ${maxChars} caracteres no total (conta espaços, pontuação e qualquer caractere especial). Conta antes de responder.`
    : '- Entre 100 e 130 palavras.'

  const prompt = `Escreve um parágrafo de fecho otimizado para SEO, para o final desta página, com base no conteúdo e nas keywords.

KEYWORDS a usar (de forma natural): ${keywordList}

CONTEÚDO DA PÁGINA:
${content.slice(0, 2000)}
${toneSection}
${WRITING_RULES}

Requisitos:
${lengthRule}
- Inclui pelo menos 2 das keywords de forma natural e gramatical. Se necessário adapta para ficar correta em português.
- Inclui uma chamada à ação (call-to-action) e tom profissional.

Responde APENAS com um objeto JSON válido (sem markdown nem texto extra), com este formato exato:
{"text":"...","mappings":[{"original":"keyword original","used":"forma usada no texto"}]}

Inclui em "mappings" TODAS as keywords usadas — mesmo as que não foram adaptadas (põe original === used nesses casos).`

  const message = await client.messages.create({
    model: TEXT_MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseTextResult(raw)
}
