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
  toneOfVoice: z.string().trim().max(2000).optional().nullable(),
  introMaxChars: z.number().int().min(100).max(1500).optional().nullable(),
  outroMaxChars: z.number().int().min(100).max(1500).optional().nullable(),
})

async function ensureUser(userId: string, email?: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing

  try {
    return await prisma.user.create({
      data: { id: userId, email: email ?? `${userId}@users.local` },
    })
  } catch (e) {
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
    const { urls, userId, email, name, toneOfVoice, introMaxChars, outroMaxChars } =
      createJobSchema.parse(body)

    await ensureUser(userId, email)

    const job = await prisma.job.create({
      data: {
        userId,
        name: name && name.length > 0 ? name : null,
        toneOfVoice: toneOfVoice && toneOfVoice.length > 0 ? toneOfVoice : null,
        introMaxChars: introMaxChars ?? null,
        outroMaxChars: outroMaxChars ?? null,
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
