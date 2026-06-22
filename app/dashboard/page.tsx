'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'
import { NewJobForm } from '@/components/jobs/new-job-form'
import { JobsList } from '@/components/jobs/jobs-list'
import { Plus, ArrowLeft } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [showNewJob, setShowNewJob] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f5f3ff',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: '#5C27D9',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <Header userEmail={user?.email} />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {showNewJob ? (
          <div>
            <button
              onClick={() => setShowNewJob(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                color: '#5C27D9',
                background: 'none',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <div style={{
              background: 'white',
              borderRadius: 16,
              boxShadow: '0 1px 4px rgba(92,39,217,0.08), 0 4px 24px rgba(92,39,217,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3D1A9E 0%, #5C27D9 60%, #7B4FE0 100%)',
                padding: '24px 32px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, position: 'relative', zIndex: 1 }}>
                  Nova Análise SEO
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, position: 'relative', zIndex: 1 }}>
                  Introduza as URLs a analisar
                </p>
              </div>
              <div style={{ padding: 32 }}>
                <NewJobForm
                  onSuccess={() => {
                    setShowNewJob(false)
                    setRefreshTrigger(prev => prev + 1)
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                  Análises SEO
                </h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  Histórico de todas as suas análises
                </p>
              </div>
              <button
                onClick={() => setShowNewJob(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #5C27D9, #7B4FE0)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(92,39,217,0.3)',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(92,39,217,0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(92,39,217,0.3)'
                }}
              >
                <Plus size={18} />
                Nova Análise
              </button>
            </div>
            <JobsList key={refreshTrigger} userId={user?.id || ''} />
          </div>
        )}
      </main>
    </div>
  )
}
