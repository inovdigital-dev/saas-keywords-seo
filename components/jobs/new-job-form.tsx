'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Upload, Loader2, FileText } from 'lucide-react'

interface NewJobFormProps {
  onSuccess: () => void
}

interface ResultItem {
  id: string
  url: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
}

// Rotating contextual hints shown while a single URL is being analysed.
const STEP_HINTS = [
  'A ler o conteúdo da página…',
  'A extrair as melhores keywords com IA…',
  'A validar o volume de pesquisa…',
  'A gerar os textos SEO…',
]

export function NewJobForm({ onSuccess }: NewJobFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste')
  const [name, setName] = useState('')
  const [urls, setUrls] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Processing state
  const [phase, setPhase] = useState<'form' | 'processing'>('form')
  const [results, setResults] = useState<ResultItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hintIndex, setHintIndex] = useState(0)

  // Rotate the contextual hint while a URL is being processed
  useEffect(() => {
    if (phase !== 'processing') return
    const t = setInterval(() => setHintIndex(i => (i + 1) % STEP_HINTS.length), 3500)
    return () => clearInterval(t)
  }, [phase, currentIndex])

  const parseUrls = (text: string): string[] => {
    return text
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0 && u.startsWith('http'))
  }

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

    try {
      // 1. Create the job (fast — no processing yet)
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
      const jobResults: ResultItem[] = job.results.map((r: ResultItem) => ({
        ...r,
        status: 'PENDING' as const,
      }))

      setResults(jobResults)
      setPhase('processing')

      // 2. Process each URL sequentially, updating progress live
      for (let i = 0; i < jobResults.length; i++) {
        setCurrentIndex(i)
        setResults(prev =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'PROCESSING' } : r))
        )

        let finalStatus: ResultItem['status'] = 'FAILED'
        try {
          const pr = await fetch(`/api/jobs/${job.id}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resultId: jobResults[i].id }),
          })
          if (pr.ok) {
            const data = await pr.json()
            finalStatus = data.result?.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED'
          }
        } catch {
          finalStatus = 'FAILED'
        }

        setResults(prev =>
          prev.map((r, idx) => (idx === i ? { ...r, status: finalStatus } : r))
        )
      }

      // 3. Done — go straight to the results page
      router.push(`/dashboard/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setPhase('form')
    }
  }

  // ─────────────────────────── Processing view ───────────────────────────
  if (phase === 'processing') {
    const done = results.filter(r => r.status === 'COMPLETED' || r.status === 'FAILED').length
    const pct = Math.round((done / results.length) * 100)
    const current = results[currentIndex]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
              A analisar {done < results.length ? currentIndex + 1 : results.length} de {results.length} URLs
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#5C27D9' }}>{pct}%</span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 10, background: '#ede9fe', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #5C27D9, #7B4FE0)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {done < results.length && (
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} style={{ color: '#5C27D9', animation: 'spin 1s linear infinite' }} />
              {STEP_HINTS[hintIndex]}
            </p>
          )}
        </div>

        {/* Live log */}
        <div style={{
          background: '#1a1530',
          borderRadius: 12,
          padding: 16,
          maxHeight: 280,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: 12.5,
        }}>
          {results.map((r, idx) => {
            const isCurrent = idx === currentIndex && r.status === 'PROCESSING'
            const color =
              r.status === 'COMPLETED' ? '#4ade80' :
              r.status === 'FAILED' ? '#f87171' :
              r.status === 'PROCESSING' ? '#c4b5fd' : '#6b7280'
            const icon =
              r.status === 'COMPLETED' ? '✓' :
              r.status === 'FAILED' ? '✗' :
              r.status === 'PROCESSING' ? '⟳' : '•'
            return (
              <div key={r.id} style={{
                color,
                padding: '3px 0',
                opacity: r.status === 'PENDING' ? 0.5 : 1,
                animation: isCurrent ? 'pulse 1.5s ease-in-out infinite' : undefined,
              }}>
                {icon} {r.url}
                {r.status === 'COMPLETED' && '  — concluído'}
                {r.status === 'FAILED' && '  — falhou'}
                {r.status === 'PROCESSING' && '  — a processar…'}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          Não feche esta página enquanto a análise decorre. Será redirecionado automaticamente quando terminar.
        </p>
      </div>
    )
  }

  // ─────────────────────────── Form view ───────────────────────────
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

  const canSubmit = inputMethod === 'paste' ? !!urls.trim() : !!file

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          color: '#dc2626',
          fontSize: 13,
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
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid #e5e7eb',
            borderRadius: 10,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#5C27D9')}
          onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
        />
      </div>

      {/* Method selector */}
      <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        <button type="button" style={tabStyle(inputMethod === 'paste')} onClick={() => setInputMethod('paste')}>
          Colar URLs
        </button>
        <button type="button" style={tabStyle(inputMethod === 'upload')} onClick={() => setInputMethod('upload')}>
          Upload CSV/TXT
        </button>
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
              width: '100%',
              padding: '12px 14px',
              border: '1.5px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.6,
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
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
              width: '100%',
              padding: '32px 24px',
              border: '2px dashed',
              borderColor: file ? '#5C27D9' : '#d1d5db',
              borderRadius: 12,
              background: file ? '#f5f3ff' : '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
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
          width: '100%',
          padding: '14px',
          background: !canSubmit ? '#d1d5db' : 'linear-gradient(135deg, #5C27D9, #7B4FE0)',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
          boxShadow: !canSubmit ? 'none' : '0 4px 12px rgba(92,39,217,0.3)',
          transition: 'all 0.15s',
        }}
      >
        Iniciar Análise
      </button>
    </form>
  )
}
