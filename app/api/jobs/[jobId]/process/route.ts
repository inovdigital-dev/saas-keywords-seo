import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processResult } from '@/lib/process'

// One URL per request keeps each invocation well within serverless limits and
// lets the client show live progress across many URLs.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const { resultId } = await request.json()

    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 })
    }

    // Mark job as processing on the first URL
    await prisma.job.updateMany({
      where: { id: jobId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    })

    // Process this single URL (scrape → keywords → validate → texts → save)
    await processResult(resultId)

    // If no PENDING results remain, finalize the job
    const remaining = await prisma.jobResult.count({
      where: { jobId, status: { in: ['PENDING', 'PROCESSING'] } },
    })

    if (remaining === 0) {
      const failedCount = await prisma.jobResult.count({
        where: { jobId, status: 'FAILED' },
      })
      const total = await prisma.jobResult.count({ where: { jobId } })
      // updateMany with a status guard so we never override a CANCELLED job
      await prisma.job.updateMany({
        where: { id: jobId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: {
          status: failedCount === total ? 'FAILED' : 'COMPLETED',
          completedAt: new Date(),
        },
      })
    }

    const result = await prisma.jobResult.findUnique({
      where: { id: resultId },
      select: { id: true, url: true, status: true, error: true },
    })

    return NextResponse.json({ result, remaining })
  } catch (error) {
    console.error('Error processing result:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error processing result' },
      { status: 500 }
    )
  }
}
