import { NextRequest, NextResponse } from 'next/server'
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

    // Create or update user — id IS the Supabase auth UUID
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error syncing user' },
      { status: 500 }
    )
  }
}
