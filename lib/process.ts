import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { fetchAndParseUrl } from './scraper'
import {
  generateKeywordsForValidation,
  generateIntroText,
  generateOutroText,
} from './claude'
import {
  validateKeywords,
  hasEnoughValidKeywords,
  rankKeywordsByScore,
} from './ahrefs-mock'

// Process all URLs in a job, sequentially. Awaited by the caller so it
// completes within the serverless function lifetime (Vercel kills detached work).
export async function processJob(jobId: string) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { results: true },
    })

    if (!job) return

    for (const result of job.results) {
      await processUrl(result.id, result.url)
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  } catch (error) {
    console.error('Error processing job:', error)
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    })
  }
}

export async function processUrl(resultId: string, url: string) {
  try {
    await prisma.jobResult.update({
      where: { id: resultId },
      data: { status: 'PROCESSING' },
    })

    // 1. Fetch and parse page content
    console.log(`[1/5] Fetching content from ${url}...`)
    const content = await fetchAndParseUrl(url)

    // 2. Generate and validate keywords (retry for low-volume keywords)
    console.log(`[2/5] Generating and validating keywords for ${url}...`)
    let finalKeywords = null
    let attemptCount = 0
    const previousAttempts: string[] = []
    const maxAttempts = 3

    while (!finalKeywords && attemptCount < maxAttempts) {
      attemptCount++
      console.log(`   Attempt ${attemptCount}/${maxAttempts}...`)

      const generatedKeywords = await generateKeywordsForValidation(content, previousAttempts)

      if (generatedKeywords.length === 0) {
        throw new Error('Failed to generate keywords')
      }

      const validatedKeywords = validateKeywords(generatedKeywords)
      const hasValidKeywords = hasEnoughValidKeywords(validatedKeywords)

      if (hasValidKeywords) {
        finalKeywords = rankKeywordsByScore(validatedKeywords)
        console.log(`   ✓ Found valid keywords on attempt ${attemptCount}`)
      } else {
        const lowVolumeKeywords = validatedKeywords
          .filter(k => !k.isValid)
          .map(k => k.keyword)

        console.log(`   ✗ Low volume keywords: ${lowVolumeKeywords.join(', ')}`)
        previousAttempts.push(...lowVolumeKeywords)

        if (attemptCount === maxAttempts) {
          finalKeywords = rankKeywordsByScore(validatedKeywords)
          console.log(`   ⚠️  Using best-effort keywords after ${maxAttempts} attempts`)
        }
      }
    }

    if (!finalKeywords) {
      throw new Error('Failed to generate valid keywords after all attempts')
    }

    // 3. Generate SEO intro text (top 2 keywords)
    console.log(`[3/5] Generating intro text...`)
    const introText = await generateIntroText(finalKeywords, content)

    // 4. Generate SEO outro text (remaining 3 keywords)
    console.log(`[4/5] Generating outro text...`)
    const outroText = await generateOutroText(finalKeywords, content)

    // 5. Save results
    console.log(`[5/5] Saving results...`)
    await prisma.jobResult.update({
      where: { id: resultId },
      data: {
        status: 'COMPLETED',
        keywords: finalKeywords as unknown as Prisma.InputJsonValue,
        introText,
        outroText,
      },
    })

    console.log(`✓ Completed processing for ${url}`)
  } catch (error) {
    console.error(`Error processing URL ${url}:`, error)
    await prisma.jobResult.update({
      where: { id: resultId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
    })
  }
}
