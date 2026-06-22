import * as cheerio from 'cheerio'
import { friendlyHttpError, humanizeError } from './errors'

// Minimum amount of real body text for a page to be analysable.
const MIN_CONTENT_LENGTH = 200

export async function fetchAndParseUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(friendlyHttpError(response.status))
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, nav, footer, .ads, noscript, [style*="display:none"]').remove()

    const title = ($('title').text() || $('h1').first().text()).trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''

    const bodyText = $('body').text()
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 8000)

    // Guard: bot-walls / JS-only pages return almost no real text. Generating
    // keywords from that produces garbage, so fail clearly instead.
    const looksBlocked =
      /powered and protected by privacy|enable javascript|access denied|are you a robot/i.test(
        cleanText
      )

    if (cleanText.length < MIN_CONTENT_LENGTH || looksBlocked) {
      throw new Error(
        'A página tem pouco conteúdo legível ou requer JavaScript/anti-bot para carregar. Não foi possível extrair texto suficiente para análise.'
      )
    }

    return `
Title: ${title}
Description: ${metaDescription}

Content:
${cleanText}
    `.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    const raw = error instanceof Error ? error.message : 'Erro desconhecido'
    throw new Error(humanizeError(raw))
  }
}
