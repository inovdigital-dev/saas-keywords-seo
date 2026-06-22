'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  userEmail?: string
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SEO Keywords SaaS</h1>
            <p className="text-sm text-gray-500">Gerador automático de keywords e conteúdo SEO</p>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && <span className="text-sm text-gray-600">{userEmail}</span>}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
