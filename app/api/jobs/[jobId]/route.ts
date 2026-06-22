import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Update job metadata (currently just the name). Allows renaming after completion.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const body = await request.json()
    const rawName = typeof body?.name === 'string' ? body.name.trim() : ''

    if (rawName.length > 120) {
      return NextResponse.json({ error: 'Nome demasiado longo (máx. 120 caracteres)' }, { status: 400 })
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: { name: rawName.length > 0 ? rawName : null },
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error updating job' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        results: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching job' },
      { status: 500 }
    )
  }
}
