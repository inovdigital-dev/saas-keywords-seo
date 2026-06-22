'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'
import { JobResults } from '@/components/jobs/job-results'
import { ArrowLeft, Loader2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:    { label: 'Pendente',    bg: '#fefce8', color: '#854d0e' },
  PROCESSING: { label: 'A processar', bg: '#f5f3ff', color: '#5b21b6' },
  COMPLETED:  { label: 'Concluído',   bg: '#f0fdf4', color: '#166534' },
  FAILED:     { label: 'Falhado',     bg: '#fef2f2', color: '#991b1b' },
}

export default function JobDetailPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string

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
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{displayName}</h1>
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

        {/* Running banner */}
        {isRunning && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          }}>
            <Loader2 size={18} style={{ color: '#5C27D9', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#5b21b6', margin: 0 }}>
              A análise ainda está a decorrer. Os resultados aparecem automaticamente à medida que ficam prontos.
            </p>
          </div>
        )}

        <JobResults results={job.results} />
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
