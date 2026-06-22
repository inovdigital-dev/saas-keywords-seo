import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createJobSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
  userId: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().trim().max(120).optional(),
})

// Ensure a user row exists for the given Supabase UUID, tolerating the rare
// case where the email is already attached to another (stale) row.
async function ensureUser(userId: string, email?: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing

  try {
    return await prisma.user.create({
      data: { id: userId, email: email ?? `${userId}@users.local` },
    })
  } catch (e) {
    // P2002 = unique constraint (email). Fall back to a non-colliding placeholder
    // so job creation never crashes; email is display-only.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return await prisma.user.create({
        data: { id: userId, email: `${userId}@users.local` },
      })
    }
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, userId, email, name } = createJobSchema.parse(body)

    // Ensure the user exists (id IS the Supabase UUID). Removes any dependency
    // on a separate sync call and tolerates stale email rows.
    await ensureUser(userId, email)

    // Create job with one PENDING result per URL. Processing is driven by the
    // client one URL at a time (see /api/jobs/[jobId]/process) so each request
    // stays well within serverless limits and progress can be shown live.
    const job = await prisma.job.create({
      data: {
        userId,
        name: name && name.length > 0 ? name : null,
        status: 'PENDING',
        results: {
          create: urls.map(url => ({ url, status: 'PENDING' })),
        },
      },
      include: { results: true },
    })

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
