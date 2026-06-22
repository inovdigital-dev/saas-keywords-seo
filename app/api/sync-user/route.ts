import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email } = body

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      )
    }

    // id IS the Supabase auth UUID. If the row exists, we're done.
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (existing) {
      return NextResponse.json(existing)
    }

    try {
      const user = await prisma.user.create({ data: { id: userId, email } })
      return NextResponse.json(user)
    } catch (e) {
      // Tolerate a stale row holding this email under a different id.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const user = await prisma.user.create({
          data: { id: userId, email: `${userId}@users.local` },
        })
        return NextResponse.json(user)
      }
      throw e
    }
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error syncing user' },
      { status: 500 }
    )
  }
}
