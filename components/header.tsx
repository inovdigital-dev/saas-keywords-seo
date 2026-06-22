'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { WppLogo } from '@/components/wpp-logo'

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
    <header style={{
      background: 'linear-gradient(135deg, #3D1A9E 0%, #5C27D9 60%, #7B4FE0 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle dot pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <WppLogo variant="white" height={26} showCommerce={true} commerceSize={11} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {userEmail && (
            <span style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.1)',
              padding: '4px 12px',
              borderRadius: 20,
            }}>
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
