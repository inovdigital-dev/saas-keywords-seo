'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'
import { JobResults } from '@/components/jobs/job-results'
import { ArrowLeft, Loader } from 'lucide-react'

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
  })

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Job não encontrado</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userEmail={user?.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">Análise SEO</h1>
              <p className="text-gray-500 text-sm">ID: {job.id}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
              job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {job.status}
            </div>
          </div>
        </div>

        <JobResults results={job.results} />
      </main>
    </div>
  )
}
