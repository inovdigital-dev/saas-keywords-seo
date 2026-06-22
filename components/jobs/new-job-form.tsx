'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Upload, Loader2, FileText } from 'lucide-react'

interface NewJobFormProps {
  onSuccess?: () => void
}

export function NewJobForm({ onSuccess }: NewJobFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste')
  const [name, setName] = useState('')
  const [urls, setUrls] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseUrls = (text: string): string[] =>
    text.split('\n').map(u => u.trim()).filter(u => u.length > 0 && u.startsWith('http'))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    let urlsToProcess: string[] = []
    if (inputMethod === 'paste') {
      urlsToProcess = parseUrls(urls)
    } else if (file) {
      urlsToProcess = parseUrls(await file.text())
    }

    if (urlsToProcess.length === 0) {
      setError('Nenhuma URL válida encontrada. Certifique-se que começam por "https://".')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create the job
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlsToProcess,
          userId: user?.id,
          email: user?.email,
          name: name.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar a análise')
      }
      const job = await res.json()

      // 2. Kick off the server-side processing chain (continues even if we leave)
      await fetch(`/api/jobs/${job.id}/run`, { method: 'POST' }).catch(() => {})

      // 3. Go to the detail page, where progress updates live
      onSuccess?.()
      router.push(`/dashboard/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setSubmitting(false)
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#5C27D9' : 'transparent',
    color: active ? 'white' : '#6b7280',
    transition: 'all 0.15s',
  })

  const canSubmit = !submitting && (inputMethod === 'paste' ? !!urls.trim() : !!file)

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div style={{
          padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, color: '#dc2626', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Job name */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Nome da análise <span style={{ color: '#9ca3af', fontWeight: 400 }}>(para identificar no histórico)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Categorias de lacticínios — Auchan"
          maxLength={120}
          style={{
            width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
            borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#5C27D9')}
          onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
        />
      </div>

      {/* Method selector */}
      <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        <button type="button" style={tabStyle(inputMethod === 'paste')} onClick={() => setInputMethod('paste')}>Colar URLs</button>
        <button type="button" style={tabStyle(inputMethod === 'upload')} onClick={() => setInputMethod('upload')}>Upload CSV/TXT</button>
      </div>

      {inputMethod === 'paste' && (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            URLs (uma por linha)
          </label>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            placeholder={'https://exemplo.com/page1\nhttps://exemplo.com/page2'}
            rows={8}
            style={{
              width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
              fontSize: 13, fontFamily: 'monospace', outline: 'none', resize: 'vertical', lineHeight: 1.6,
              boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#5C27D9')}
            onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            Mínimo 1 URL · Máximo 200 URLs · Devem começar por "https://"
          </p>
        </div>
      )}

      {inputMethod === 'upload' && (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '32px 24px', border: '2px dashed', borderColor: file ? '#5C27D9' : '#d1d5db',
              borderRadius: 12, background: file ? '#f5f3ff' : '#fafafa', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {file ? (
              <>
                <FileText size={28} style={{ color: '#5C27D9' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#5C27D9' }}>{file.name}</span>
                <span style={{ fontSize: 12, color: '#7c3aed' }}>Ficheiro selecionado ✓</span>
              </>
            ) : (
              <>
                <Upload size={28} style={{ color: '#9ca3af' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Clique para selecionar ficheiro</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>.csv ou .txt</span>
              </>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '14px',
          background: !canSubmit ? '#d1d5db' : 'linear-gradient(135deg, #5C27D9, #7B4FE0)',
          color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
          boxShadow: !canSubmit ? 'none' : '0 4px 12px rgba(92,39,217,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
        }}
      >
        {submitting && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
        {submitting ? 'A iniciar análise…' : 'Iniciar Análise'}
      </button>
    </form>
  )
}
