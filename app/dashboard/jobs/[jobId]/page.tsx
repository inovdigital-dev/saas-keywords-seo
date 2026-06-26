'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'
import { JobResults } from '@/components/jobs/job-results'
import { ArrowLeft, Loader2, Pencil, Check, X, Square, RotateCw } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:    { label: 'Pendente',    bg: '#fefce8', color: '#854d0e' },
  PROCESSING: { label: 'A processar', bg: '#f5f3ff', color: '#5b21b6' },
  COMPLETED:  { label: 'Concluído',   bg: '#f0fdf4', color: '#166534' },
  FAILED:     { label: 'Falhado',     bg: '#fef2f2', color: '#991b1b' },
  CANCELLED:  { label: 'Interrompido', bg: '#f3f4f6', color: '#4b5563' },
}

export default function JobDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const jobId = params.jobId as string

  const [isEditing, setIsEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [resuming, setResuming] = useState(false)

  const cancelJob = async () => {
    setCancelling(true)
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
    } finally {
      setCancelling(false)
    }
  }

  const resumeJob = async () => {
    setResuming(true)
    try {
      await fetch(`/api/jobs/${jobId}/run`, { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] })
    } finally {
      setTimeout(() => setResuming(false), 1500)
    }
  }

  const saveName = async () => {
    setSaving(true)
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput }),
      })
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      await queryClient.invalidateQueries({ queryKey: ['jobs'] })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) throw new Error('Erro ao carregar job')
      return response.json()
    },
    enabled: !!jobId,
    // Keep refreshing while the job is still running
    refetchInterval: q => {
      const s = (q.state.data as { status?: string } | undefined)?.status
      return s === 'PENDING' || s === 'PROCESSING' ? 4000 : false
    },
  })

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
        <Header userEmail={user?.email} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={28} style={{ color: '#5C27D9', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
        <Header userEmail={user?.email} />
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', color: '#6b7280' }}>
            Análise não encontrada.
          </div>
        </main>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING
  const displayName = job.name?.trim() || `Análise de ${job.results.length} URL${job.results.length !== 1 ? 's' : ''}`
  const isRunning = job.status === 'PENDING' || job.status === 'PROCESSING'
  const completedCount = job.results.filter((r: { status: string }) => r.status === 'COMPLETED').length
  const failedCount = job.results.filter((r: { status: string }) => r.status === 'FAILED').length
  const processed = completedCount + failedCount
  const pct = job.results.length > 0 ? Math.round((processed / job.results.length) * 100) : 0
  const lastActivity = Math.max(
    new Date(job.createdAt).getTime(),
    ...job.results.map((r: { updatedAt: string }) => new Date(r.updatedAt).getTime())
  )
  // If running but nothing has progressed for a while, the chain likely died.
  const stalled = isRunning && Date.now() - lastActivity > 90_000 && !resuming

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ff' }}>
      <Header userEmail={user?.email} />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
            color: '#5C27D9', background: 'none', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Voltar ao histórico
        </button>

        {/* Title card */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 24, marginBottom: 20,
          boxShadow: '0 1px 4px rgba(92,39,217,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setIsEditing(false) }}
                    maxLength={120}
                    placeholder="Nome da análise"
                    style={{
                      flex: 1, fontSize: 20, fontWeight: 700, color: '#1a1a2e',
                      padding: '6px 10px', border: '1.5px solid #5C27D9', borderRadius: 8, outline: 'none',
                    }}
                  />
                  <button onClick={saveName} disabled={saving} title="Guardar" style={{
                    display: 'flex', padding: 8, background: '#5C27D9', border: 'none', borderRadius: 8,
                    cursor: saving ? 'wait' : 'pointer',
                  }}>
                    {saving ? <Loader2 size={16} style={{ color: 'white', animation: 'spin 1s linear infinite' }} /> : <Check size={16} style={{ color: 'white' }} />}
                  </button>
                  <button onClick={() => setIsEditing(false)} disabled={saving} title="Cancelar" style={{
                    display: 'flex', padding: 8, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
                  }}>
                    <X size={16} style={{ color: '#6b7280' }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{displayName}</h1>
                  <button
                    onClick={() => { setNameInput(job.name ?? ''); setIsEditing(true) }}
                    title="Editar nome"
                    style={{
                      display: 'flex', padding: 6, background: 'transparent', border: 'none',
                      borderRadius: 6, cursor: 'pointer', color: '#9ca3af',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#5C27D9')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, fontFamily: 'monospace' }}>
                {job.id}
              </p>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: 20, background: cfg.bg, color: cfg.color,
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {cfg.label}
            </span>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
            <Stat label="Total URLs" value={job.results.length} />
            <Stat label="Concluídas" value={completedCount} color="#16a34a" />
            <Stat label="Falhadas" value={failedCount} color={failedCount > 0 ? '#dc2626' : '#9ca3af'} />
          </div>
        </div>

        {/* Running banner with progress */}
        {isRunning && (
          <div style={{
            background: '#f5f3ff', border: `1px solid ${stalled ? '#fcd34d' : '#ddd6fe'}`,
            borderRadius: 12, padding: '16px 18px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {stalled
                ? <RotateCw size={18} style={{ color: '#b45309', flexShrink: 0 }} />
                : <Loader2 size={18} style={{ color: '#5C27D9', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
              <p style={{ fontSize: 13, color: stalled ? '#92400e' : '#5b21b6', margin: 0, flex: 1 }}>
                {stalled
                  ? 'A análise parece ter parado. Pode retomá-la para continuar de onde ficou.'
                  : 'A análise está a decorrer no servidor — pode fechar esta página, que continua. Os resultados aparecem automaticamente.'}
              </p>
              {stalled && (
                <button
                  onClick={resumeJob}
                  disabled={resuming}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '8px 14px',
                    background: '#5C27D9', color: 'white', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: resuming ? 'wait' : 'pointer',
                  }}
                >
                  <RotateCw size={14} style={resuming ? { animation: 'spin 1s linear infinite' } : undefined} />
                  {resuming ? 'A retomar…' : 'Retomar'}
                </button>
              )}
              <button
                onClick={cancelJob}
                disabled={cancelling}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '8px 14px',
                  background: cancelling ? '#f3f4f6' : 'white',
                  color: cancelling ? '#9ca3af' : '#dc2626',
                  border: `1.5px solid ${cancelling ? '#e5e7eb' : '#fecaca'}`,
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: cancelling ? 'wait' : 'pointer',
                }}
              >
                <Square size={14} />
                {cancelling ? 'A interromper…' : 'Interromper'}
              </button>
            </div>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 8, background: '#ede9fe', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: 'linear-gradient(90deg, #5C27D9, #7B4FE0)', borderRadius: 99, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6', flexShrink: 0 }}>
                {processed}/{job.results.length}
              </span>
            </div>
          </div>
        )}

        <JobResults
          results={job.results}
          introMaxChars={job.introMaxChars}
          outroMaxChars={job.outroMaxChars}
        />
      </main>
    </div>
  )
}

function Stat({ label, value, color = '#1a1a2e' }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}
