'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/use-auth'
import { NewJobForm } from '@/components/jobs/new-job-form'
import { JobsList } from '@/components/jobs/jobs-list'
import { Plus } from 'lucide-react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const [showNewJob, setShowNewJob] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userEmail={user?.email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showNewJob ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Nova Análise SEO</h2>
            <NewJobForm
              onSuccess={() => {
                setShowNewJob(false)
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Meus Jobs</h2>
              <button
                onClick={() => setShowNewJob(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus size={20} />
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
