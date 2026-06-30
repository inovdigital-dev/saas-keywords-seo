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
} from './ahrefs'

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

// Process a single result by its id (looks up the URL itself).
export async function processResult(resultId: string) {
  const result = await prisma.jobResult.findUnique({ where: { id: resultId } })
  if (!result) throw new Error('Result not found')
  await processUrl(result.id, result.url)
}

// If no results are left to process, mark the job COMPLETED (or FAILED if all
// failed). Uses a status guard so it never overrides a CANCELLED job.
export async function finalizeJobIfDone(jobId: string): Promise<boolean> {
  const remaining = await prisma.jobResult.count({
    where: { jobId, status: { in: ['PENDING', 'PROCESSING'] } },
  })
  if (remaining > 0) return false

  const failed = await prisma.jobResult.count({ where: { jobId, status: 'FAILED' } })
  const total = await prisma.jobResult.count({ where: { jobId } })
  await prisma.job.updateMany({
    where: { id: jobId, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: failed === total ? 'FAILED' : 'COMPLETED', completedAt: new Date() },
  })
  return true
}

export async function processUrl(resultId: string, url: string) {
  try {
    await prisma.jobResult.update({
      where: { id: resultId },
      data: { status: 'PROCESSING' },
    })

    // Fetch job settings (tone of voice, char limits) alongside the result
    const resultInfo = await prisma.jobResult.findUnique({
      where: { id: resultId },
      select: {
        job: { select: { country: true, toneOfVoice: true, introMaxChars: true, outroMaxChars: true } },
      },
    })
    const { country = 'pt', toneOfVoice, introMaxChars, outroMaxChars } = resultInfo?.job ?? {}

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

      const validatedKeywords = await validateKeywords(generatedKeywords, country)
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
    const introResult = await generateIntroText(finalKeywords, content, toneOfVoice, introMaxChars)

    // 4. Generate SEO outro text (remaining 3 keywords)
    console.log(`[4/5] Generating outro text...`)
    const outroResult = await generateOutroText(finalKeywords, content, toneOfVoice, outroMaxChars)

    // 5. Save results
    console.log(`[5/5] Saving results...`)
    await prisma.jobResult.update({
      where: { id: resultId },
      data: {
        status: 'COMPLETED',
        keywords: finalKeywords as unknown as Prisma.InputJsonValue,
        introText: introResult.text,
        introKeywordMap: introResult.mappings as unknown as Prisma.InputJsonValue,
        outroText: outroResult.text,
        outroKeywordMap: outroResult.mappings as unknown as Prisma.InputJsonValue,
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
