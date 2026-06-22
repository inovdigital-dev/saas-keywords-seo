'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Loader } from 'lucide-react'

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

export function JobsList({ userId }: JobsListProps) {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', userId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs?userId=${userId}`)
      if (!response.ok) throw new Error('Erro ao carregar jobs')
      return response.json() as Promise<Job[]>
    },
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="animate-spin" />
      </div>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500 mb-4">Nenhum job encontrado</p>
        <p className="text-sm text-gray-400">Crie um novo job para começar</p>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    }
    return colors[status] || colors.PENDING
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Job ID</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">URLs</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criado em</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ação</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-mono text-gray-700">{job.id.slice(0, 8)}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{job.results.length} URLs</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {format(new Date(job.createdAt), 'dd MMM yyyy HH:mm', { locale: ptBR })}
              </td>
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Eye size={16} />
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
