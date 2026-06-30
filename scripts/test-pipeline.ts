import { fetchAndParseUrl } from '../lib/scraper'
import {
  generateKeywordsForValidation,
  generateIntroText,
  generateOutroText,
} from '../lib/claude'
import {
  validateKeywords,
  hasEnoughValidKeywords,
  rankKeywordsByScore,
} from '../lib/ahrefs'

const URLS = [
  'https://www.auchan.pt/pt/alimentacao/produtos-lacteos/iogurtes/',
  'https://www.adidas.pt/casacos-mulher',
]

async function testUrl(url: string) {
  const t0 = Date.now()
  console.log('\n' + '='.repeat(70))
  console.log(`URL: ${url}`)
  console.log('='.repeat(70))

  // 1. Scrape
  let content: string
  try {
    const ts = Date.now()
    content = await fetchAndParseUrl(url)
    console.log(`✓ [1] Scrape OK (${Date.now() - ts}ms) — ${content.length} chars`)
    console.log(`    Preview: ${content.slice(0, 160).replace(/\n/g, ' ')}...`)
  } catch (e) {
    console.log(`✗ [1] Scrape FAILED: ${e instanceof Error ? e.message : e}`)
    return { url, ok: false, step: 'scrape' }
  }

  // 2. Keywords + validation (with retry)
  let finalKeywords = null
  let attempt = 0
  const previousAttempts: string[] = []
  try {
    const ts = Date.now()
    while (!finalKeywords && attempt < 3) {
      attempt++
      const generated = await generateKeywordsForValidation(content, previousAttempts)
      if (generated.length === 0) throw new Error('0 keywords generated')
      const validated = await validateKeywords(generated, 'pt')
      if (hasEnoughValidKeywords(validated)) {
        finalKeywords = rankKeywordsByScore(validated)
      } else {
        previousAttempts.push(...validated.filter(k => !k.isValid).map(k => k.keyword))
        if (attempt === 3) finalKeywords = rankKeywordsByScore(validated)
      }
    }
    console.log(`✓ [2] Keywords OK (${Date.now() - ts}ms, ${attempt} attempt(s)):`)
    finalKeywords!.forEach(k =>
      console.log(`    • ${k.keyword} — vol:${k.searchVolume} dif:${k.difficulty} score:${k.score} ${k.isValid ? '✓' : '✗'}`)
    )
  } catch (e) {
    console.log(`✗ [2] Keywords FAILED: ${e instanceof Error ? e.message : e}`)
    return { url, ok: false, step: 'keywords' }
  }

  // 3. Intro text
  let introText = ''
  try {
    const ts = Date.now()
    const introResult = await generateIntroText(finalKeywords!, content)
    introText = introResult.text
    const words = introText.split(/\s+/).length
    const chars = [...introText].length
    console.log(`✓ [3] Intro OK (${Date.now() - ts}ms, ${words} words, ${chars} chars):`)
    console.log(`    ${introText}`)
    if (introResult.mappings.length > 0) {
      console.log(`    mappings: ${introResult.mappings.map(m => `"${m.original}" → "${m.used}"`).join(' | ')}`)
    }
  } catch (e) {
    console.log(`✗ [3] Intro FAILED: ${e instanceof Error ? e.message : e}`)
    return { url, ok: false, step: 'intro' }
  }

  // 4. Outro text
  let outroText = ''
  try {
    const ts = Date.now()
    const outroResult = await generateOutroText(finalKeywords!, content)
    outroText = outroResult.text
    const words = outroText.split(/\s+/).length
    const chars = [...outroText].length
    console.log(`✓ [4] Outro OK (${Date.now() - ts}ms, ${words} words, ${chars} chars):`)
    console.log(`    ${outroText}`)
    if (outroResult.mappings.length > 0) {
      console.log(`    mappings: ${outroResult.mappings.map(m => `"${m.original}" → "${m.used}"`).join(' | ')}`)
    }
  } catch (e) {
    console.log(`✗ [4] Outro FAILED: ${e instanceof Error ? e.message : e}`)
    return { url, ok: false, step: 'outro' }
  }

  console.log(`\n✓ URL COMPLETE in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  return { url, ok: true, seconds: (Date.now() - t0) / 1000 }
}

async function main() {
  console.log('Testing full pipeline (scrape → keywords → validate → intro → outro)')
  const results = []
  for (const url of URLS) {
    results.push(await testUrl(url))
  }
  console.log('\n' + '='.repeat(70))
  console.log('SUMMARY')
  console.log('='.repeat(70))
  results.forEach(r =>
    console.log(`${r.ok ? '✓ PASS' : '✗ FAIL'} — ${r.url}${r.ok ? ` (${r.seconds}s)` : ` (failed at: ${r.step})`}`)
  )
}

main().catch(console.error)
