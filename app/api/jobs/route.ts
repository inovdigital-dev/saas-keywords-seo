import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createJobSchema = z.object({
  urls: z.array(z.string().url()),
  userId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, userId } = createJobSchema.parse(body)

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create job and results
    const job = await prisma.job.create({
      data: {
        userId,
        status: 'PENDING',
        results: {
          create: urls.map(url => ({
            url,
            status: 'PENDING',
          })),
        },
      },
      include: {
        results: true,
      },
    })

    // Start background processing
    processJob(job.id).catch(console.error)

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error creating job' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const jobs = await prisma.job.findMany({
      where: { userId },
      include: {
        results: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching jobs' },
      { status: 500 }
    )
  }
}

// Background job processing
async function processJob(jobId: string) {
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

    // Process each URL
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

async function processUrl(resultId: string, url: string) {
  const { fetchAndParseUrl } = await import('@/lib/scraper')
  const {
    generateKeywordsForValidation,
    generateIntroText,
    generateOutroText,
  } = await import('@/lib/claude')
  const { validateKeywords, hasEnoughValidKeywords, rankKeywordsByScore } = await import(
    '@/lib/ahrefs-mock'
  )

  try {
    await prisma.jobResult.update({
      where: { id: resultId },
      data: { status: 'PROCESSING' },
    })

    // 1. Fetch and parse page content
    console.log(`[1/5] Fetching content from ${url}...`)
    const content = await fetchAndParseUrl(url)

    // 2. Generate and validate keywords (with retry for low-volume keywords)
    console.log(`[2/5] Generating and validating keywords for ${url}...`)
    let finalKeywords = null
    let attemptCount = 0
    const previousAttempts: string[] = []
    const maxAttempts = 3

    while (!finalKeywords && attemptCount < maxAttempts) {
      attemptCount++
      console.log(`   Attempt ${attemptCount}/${maxAttempts}...`)

      // Generate 5 keywords
      const generatedKeywords = await generateKeywordsForValidation(content, previousAttempts)

      if (generatedKeywords.length === 0) {
        throw new Error('Failed to generate keywords')
      }

      // Validate with Ahrefs mock
      const validatedKeywords = validateKeywords(generatedKeywords)
      const hasValidKeywords = hasEnoughValidKeywords(validatedKeywords)

      if (hasValidKeywords) {
        // All keywords have good volume - use them
        finalKeywords = rankKeywordsByScore(validatedKeywords)
        console.log(`   ✓ Found valid keywords on attempt ${attemptCount}`)
      } else {
        // Some keywords have low volume - try alternatives
        const lowVolumeKeywords = validatedKeywords
          .filter(k => !k.isValid)
          .map(k => k.keyword)

        console.log(`   ✗ Low volume keywords: ${lowVolumeKeywords.join(', ')}`)
        previousAttempts.push(...lowVolumeKeywords)

        if (attemptCount === maxAttempts) {
          // Use what we have (best-effort)
          finalKeywords = rankKeywordsByScore(validatedKeywords)
          console.log(`   ⚠️  Using best-effort keywords after ${maxAttempts} attempts`)
        }
      }
    }

    if (!finalKeywords) {
      throw new Error('Failed to generate valid keywords after all attempts')
    }

    // 3. Generate SEO intro text (using top 2 keywords)
    console.log(`[3/5] Generating intro text...`)
    const introText = await generateIntroText(finalKeywords, content)

    // 4. Generate SEO outro text (using remaining 3 keywords)
    console.log(`[4/5] Generating outro text...`)
    const outroText = await generateOutroText(finalKeywords, content)

    // 5. Save results
    console.log(`[5/5] Saving results...`)
    await prisma.jobResult.update({
      where: { id: resultId },
      data: {
        status: 'COMPLETED',
        keywords: finalKeywords,
        introText,
        outroText,
      },
    })

    console.log(`✓ Completed processing for ${url}`)
  } catch (error) {
    console.error(`Error processing URL ${url}:`, error)
    await prisma.jobResult.update({
      where: { id: resultId },
      data: { status: 'FAILED' },
    })
  }
}
