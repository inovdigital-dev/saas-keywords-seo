'use client'

import { Auth } from '@supabase/auth-ui-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { WppLogo } from '@/components/wpp-logo'

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push('/dashboard')
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3D1A9E 0%, #5C27D9 50%, #7B4FE0 100%)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'white',
              opacity: 0.8,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3D1A9E 0%, #5C27D9 50%, #7B4FE0 100%)',
    }}>
      {/* Left panel - Brand */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background dots pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <WppLogo size="lg" variant="full" />

          <div style={{ marginTop: 48, color: 'white' }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: 16,
            }}>
              Geração automática<br />de keywords SEO
            </h2>
            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              maxWidth: 360,
            }}>
              Analise URLs, extraia as melhores keywords com IA e gere conteúdo SEO otimizado em segundos.
            </p>
          </div>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '⚡', label: 'Análise com IA' },
              { icon: '📊', label: 'Validação de volume de pesquisa' },
              { icon: '✍️', label: 'Conteúdo SEO gerado automaticamente' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div style={{
        width: 480,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 48px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Faça login para aceder à plataforma WPP Commerce
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            style: {
              button: {
                background: '#5C27D9',
                color: 'white',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                padding: '12px 16px',
                fontSize: '14px',
                cursor: 'pointer',
              },
              anchor: {
                color: '#5C27D9',
                fontWeight: '500',
              },
              input: {
                borderRadius: '8px',
                border: '1.5px solid #e5e7eb',
                padding: '12px 14px',
                fontSize: '14px',
                outline: 'none',
              },
              label: {
                color: '#374151',
                fontWeight: '500',
                fontSize: '13px',
                marginBottom: '6px',
              },
              message: {
                color: '#dc2626',
                fontSize: '13px',
              },
            },
          }}
          providers={['google', 'github']}
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Password',
                button_label: 'Entrar',
                loading_button_label: 'A entrar...',
                social_provider_text: 'Continuar com {{provider}}',
                link_text: 'Já tem conta? Entre',
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Password',
                button_label: 'Criar conta',
                loading_button_label: 'A criar conta...',
                social_provider_text: 'Continuar com {{provider}}',
                link_text: 'Não tem conta? Registe-se',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
