'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/auth')
        return
      }
      setUser(data.session.user)
      // Sync user with database
      await syncUser(data.session.user.id, data.session.user.email || '')
      setIsLoading(false)
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        router.push('/auth')
      } else {
        setUser(session.user)
        await syncUser(session.user.id, session.user.email || '')
      }
      setIsLoading(false)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [router])

  return { user, isLoading }
}

async function syncUser(userId: string, email: string) {
  try {
    await fetch('/api/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email }),
    })
  } catch (error) {
    console.error('Error syncing user:', error)
  }
}
