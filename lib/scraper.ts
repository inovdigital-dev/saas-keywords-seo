import * as cheerio from 'cheerio'

export async function fetchAndParseUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove script, style, and other non-content elements
    $('script, style, nav, footer, .ads, [style*="display:none"]').remove()

    // Extract main content
    const title = $('title').text() || $('h1').first().text()
    const metaDescription = $('meta[name="description"]').attr('content') || ''

    // Get body text
    const bodyText = $('body').text()

    // Clean and normalize text
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 8000) // Limit to 8000 chars to avoid huge tokens

    return `
Title: ${title}
Description: ${metaDescription}

Content:
${cleanText}
    `.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
