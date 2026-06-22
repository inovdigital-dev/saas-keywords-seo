import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Mark a running job as cancelled. URLs already processed keep their results;
// the ones not yet processed stay PENDING (shown as "não processada").
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const updated = await prisma.job.updateMany({
      where: { id: jobId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })

    return NextResponse.json({ cancelled: updated.count > 0 })
  } catch (error) {
    console.error('Error cancelling job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error cancelling job' },
      { status: 500 }
    )
  }
}
