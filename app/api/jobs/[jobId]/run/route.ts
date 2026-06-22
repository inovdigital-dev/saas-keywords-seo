import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processResult, finalizeJobIfDone } from '@/lib/process'

// Server-side worker: processes ONE URL per invocation, then triggers the next
// invocation over HTTP. The chain runs entirely on the server, so it continues
// even if the user closes the page. Each invocation stays well within limits.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// If a URL has been "PROCESSING" longer than this, assume the chain that owned
// it died and make it eligible for reprocessing.
const STALE_PROCESSING_MS = 120_000

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const baseUrl = getBaseUrl(req)

  // Respond immediately; do the work (and chain) after the response.
  after(async () => {
    await runNext(jobId, baseUrl)
  })

  return NextResponse.json({ ok: true })
}

async function trigger(jobId: string, baseUrl: string) {
  await fetch(`${baseUrl}/api/jobs/${jobId}/run`, { method: 'POST' }).catch(() => {})
}

async function runNext(jobId: string, baseUrl: string) {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } })
    if (!job) return
    // Stop the chain on terminal/cancelled states
    if (['CANCELLED', 'COMPLETED', 'FAILED'].includes(job.status)) return

    if (job.status === 'PENDING') {
      await prisma.job.updateMany({ where: { id: jobId, status: 'PENDING' }, data: { status: 'PROCESSING' } })
    }

    // Recover URLs stuck in PROCESSING from a chain that died mid-way
    await prisma.jobResult.updateMany({
      where: { jobId, status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
      data: { status: 'PENDING' },
    })

    // Atomically claim the next PENDING URL so parallel chains never collide
    const next = await prisma.jobResult.findFirst({
      where: { jobId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })

    if (!next) {
      await finalizeJobIfDone(jobId)
      return
    }

    const claim = await prisma.jobResult.updateMany({
      where: { id: next.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    })
    if (claim.count === 0) {
      // Someone else claimed it — keep the chain moving
      await trigger(jobId, baseUrl)
      return
    }

    await processResult(next.id)

    const done = await finalizeJobIfDone(jobId)
    if (!done) await trigger(jobId, baseUrl)
  } catch (e) {
    console.error('runNext error:', e)
    // Best effort: keep the chain alive so one hiccup doesn't stall everything
    await trigger(jobId, baseUrl)
  }
}
