import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processJob } from '@/lib/process'
import { z } from 'zod'

// Allow up to 60s (Vercel Hobby max) so processing completes within the request.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const createJobSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
  userId: z.string().min(1),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, userId, email } = createJobSchema.parse(body)

    // Ensure the user exists (id IS the Supabase UUID). Upsert removes any
    // dependency on a separate sync call having completed first.
    await prisma.user.upsert({
      where: { id: userId },
      update: email ? { email } : {},
      create: { id: userId, email: email ?? `${userId}@unknown.local` },
    })

    // Create job with one PENDING result per URL
    const job = await prisma.job.create({
      data: {
        userId,
        status: 'PENDING',
        results: {
          create: urls.map(url => ({ url, status: 'PENDING' })),
        },
      },
      include: { results: true },
    })

    // Process synchronously — detached work is killed on serverless.
    await processJob(job.id)

    const completed = await prisma.job.findUnique({
      where: { id: job.id },
      include: { results: true },
    })

    return NextResponse.json(completed)
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
        results: { select: { id: true } },
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
