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
        return
      }
      setIsLoading(false)
    }
    checkAuth()

    // Redirect to dashboard after successful login/signup
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => listener.subscription.unsubscribe()
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
        <div style={{ display: 'flex', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: 'white',
              opacity: 0.8,
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
    }}>
      {/* ── Left panel — Brand ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, #2A0F7A 0%, #3D1A9E 30%, #5C27D9 70%, #7B4FE0 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '56px 72px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot pattern background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo WPP real */}
          <WppLogo variant="white" height={40} showCommerce={false} />

          {/* "Commerce" — destaque principal */}
          <div style={{ marginTop: 12 }}>
            <span style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'block',
              lineHeight: 1,
            }}>
              Commerce
            </span>
            <div style={{
              width: 48,
              height: 3,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: 2,
              marginTop: 10,
            }} />
          </div>

          {/* Tagline */}
          <div style={{ marginTop: 40 }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'white',
              lineHeight: 1.4,
              marginBottom: 12,
            }}>
              Geração automática<br />de keywords SEO
            </h2>
            <p style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.7,
              maxWidth: 340,
            }}>
              Analise URLs, extraia as melhores keywords com IA e gere conteúdo SEO otimizado em segundos.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '⚡', label: 'Análise com IA (Claude)' },
              { icon: '📊', label: 'Validação de volume de pesquisa' },
              { icon: '✍️', label: 'Textos SEO gerados automaticamente' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  {icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — Auth form ── */}
      <div style={{
        width: 500,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '56px 56px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
      }}>
        {/* Logo dark no topo do formulário */}
        <div style={{ marginBottom: 40 }}>
          <WppLogo variant="dark" height={28} showCommerce={false} />
          <div style={{ marginTop: 24 }}>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1a1a2e',
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}>
              Bem-vindo de volta
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Aceda à plataforma <strong style={{ color: '#5C27D9' }}>WPP Commerce</strong>
            </p>
          </div>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            style: {
              button: {
                background: '#5C27D9',
                color: 'white',
                fontWeight: '600',
                borderRadius: '10px',
                border: 'none',
                padding: '13px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              },
              anchor: {
                color: '#5C27D9',
                fontWeight: '500',
              },
              input: {
                borderRadius: '10px',
                border: '1.5px solid #e5e7eb',
                padding: '13px 14px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s',
              },
              label: {
                color: '#374151',
                fontWeight: '600',
                fontSize: '13px',
                marginBottom: '6px',
              },
              message: {
                color: '#dc2626',
                fontSize: '13px',
              },
              divider: {
                background: '#e5e7eb',
              },
            },
          }}
          providers={[]}
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
