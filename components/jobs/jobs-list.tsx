'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Loader2, BarChart2 } from 'lucide-react'

interface JobsListProps {
  userId: string
}

interface Job {
  id: string
  status: string
  createdAt: string
  completedAt: string | null
  results: { id: string }[]
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  PENDING:    { label: 'Pendente',    bg: '#fefce8', color: '#854d0e', dot: '#eab308' },
  PROCESSING: { label: 'A processar', bg: '#f5f3ff', color: '#5b21b6', dot: '#5C27D9' },
  COMPLETED:  { label: 'Concluído',   bg: '#f0fdf4', color: '#166534', dot: '#16a34a' },
  FAILED:     { label: 'Falhado',     bg: '#fef2f2', color: '#991b1b', dot: '#dc2626' },
}

export function JobsList({ userId }: JobsListProps) {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', userId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs?userId=${userId}`)
      if (!response.ok) throw new Error('Erro ao carregar jobs')
      return response.json() as Promise<Job[]>
    },
    enabled: !!userId,
    refetchInterval: 8000,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
        <Loader2 size={28} style={{ color: '#5C27D9', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(92,39,217,0.08)',
        padding: 64,
        textAlign: 'center',
      }}>
        <BarChart2 size={40} style={{ color: '#d1d5db', margin: '0 auto 16px' }} />
        <p style={{ color: '#374151', fontWeight: 600, marginBottom: 8 }}>Nenhuma análise ainda</p>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Clique em "Nova Análise" para começar</p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 1px 4px rgba(92,39,217,0.08), 0 4px 24px rgba(92,39,217,0.04)',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#faf8ff', borderBottom: '1px solid #ede9fe' }}>
            {['Job ID', 'Status', 'URLs', 'Criado em', ''].map(h => (
              <th key={h} style={{
                padding: '12px 20px',
                textAlign: 'left',
                fontSize: 12,
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, idx) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING
            return (
              <tr key={job.id} style={{
                borderBottom: idx < jobs.length - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf8ff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#5C27D9',
                    background: '#f5f3ff',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 600,
                  }}>
                    {job.id.slice(0, 8)}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: cfg.bg,
                    color: cfg.color,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    <span style={{
                      width: 6, height: 6,
                      borderRadius: '50%',
                      background: cfg.dot,
                      ...(job.status === 'PROCESSING' ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
                    }} />
                    {cfg.label}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                  {job.results.length} URLs
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13, color: '#6b7280' }}>
                  {format(new Date(job.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      background: '#f5f3ff',
                      color: '#5C27D9',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#f5f3ff')}
                  >
                    <Eye size={14} />
                    Ver
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
