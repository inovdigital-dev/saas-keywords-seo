'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Upload, Loader2, FileText, ChevronDown } from 'lucide-react'

interface NewJobFormProps {
  onSuccess?: () => void
}

const NO_LIMIT = 1500 // sentinel value on the slider = no limit sent to API

export function NewJobForm({ onSuccess }: NewJobFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('pt')
  const [toneOfVoice, setToneOfVoice] = useState('')
  const [introCharLimit, setIntroCharLimit] = useState(NO_LIMIT)
  const [outroCharLimit, setOutroCharLimit] = useState(NO_LIMIT)
  const [showAdvanced, setShowAdvanced] = useState(false)
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
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlsToProcess,
          userId: user?.id,
          email: user?.email,
          name: name.trim() || undefined,
          country,
          toneOfVoice: toneOfVoice.trim() || null,
          introMaxChars: introCharLimit < NO_LIMIT ? introCharLimit : null,
          outroMaxChars: outroCharLimit < NO_LIMIT ? outroCharLimit : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar a análise')
      }
      const job = await res.json()

      await fetch(`/api/jobs/${job.id}/run`, { method: 'POST' }).catch(() => {})

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

  const charLimitLabel = (val: number) =>
    val >= NO_LIMIT ? 'Sem limite' : `${val} car.`

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

      {/* Country selector */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          País de pesquisa
          <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
            (afeta os volumes e dificuldade das keywords via Ahrefs)
          </span>
        </label>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
            borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
            background: 'white', cursor: 'pointer', transition: 'border-color 0.15s',
            appearance: 'auto',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#5C27D9')}
          onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          <option value="pt">🇵🇹 Portugal</option>
          <option value="br">🇧🇷 Brasil</option>
          <option value="es">🇪🇸 Espanha</option>
          <option value="fr">🇫🇷 França</option>
          <option value="de">🇩🇪 Alemanha</option>
          <option value="gb">🇬🇧 Reino Unido</option>
          <option value="it">🇮🇹 Itália</option>
          <option value="nl">🇳🇱 Países Baixos</option>
          <option value="be">🇧🇪 Bélgica</option>
          <option value="pl">🇵🇱 Polónia</option>
          <option value="se">🇸🇪 Suécia</option>
          <option value="us">🇺🇸 Estados Unidos</option>
          <option value="mx">🇲🇽 México</option>
          <option value="ar">🇦🇷 Argentina</option>
        </select>
      </div>

      {/* Advanced settings toggle */}
      <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', background: showAdvanced ? '#faf8ff' : 'white',
            border: 'none', cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Configurações de geração
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>
              tom de voz · limites de caracteres
            </span>
          </span>
          <ChevronDown
            size={16}
            style={{ color: '#9ca3af', transition: 'transform 0.2s', transform: showAdvanced ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {showAdvanced && (
          <div style={{ padding: '0 16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Tone of voice */}
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Tom de voz da marca
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>(opcional)</span>
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Instruções sobre o estilo, tom e restrições de linguagem. O algoritmo vai respeitar estas diretrizes ao gerar os textos.
              </p>
              <textarea
                value={toneOfVoice}
                onChange={e => setToneOfVoice(e.target.value)}
                placeholder={'Ex.: Tom direto e confiante, sem ser demasiado formal. A marca chama-se sempre "Auchan", nunca "o Auchan" nem "Auchan\'s". Destaca variedade e conveniência. Evita superlativos exagerados.'}
                rows={4}
                maxLength={2000}
                style={{
                  width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10,
                  fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6,
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#5C27D9')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>
                {toneOfVoice.length}/2000
              </p>
            </div>

            {/* Char limit sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Intro */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Introdução — máx. caracteres
                  </label>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: introCharLimit < NO_LIMIT ? '#f5f3ff' : '#f9fafb',
                    color: introCharLimit < NO_LIMIT ? '#5C27D9' : '#9ca3af',
                  }}>
                    {charLimitLabel(introCharLimit)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={NO_LIMIT}
                  step={5}
                  value={introCharLimit}
                  onChange={e => setIntroCharLimit(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#5C27D9' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  <span>100</span>
                  <span>Sem limite</span>
                </div>
              </div>

              {/* Outro */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Fecho — máx. caracteres
                  </label>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: outroCharLimit < NO_LIMIT ? '#f5f3ff' : '#f9fafb',
                    color: outroCharLimit < NO_LIMIT ? '#5C27D9' : '#9ca3af',
                  }}>
                    {charLimitLabel(outroCharLimit)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={NO_LIMIT}
                  step={5}
                  value={outroCharLimit}
                  onChange={e => setOutroCharLimit(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#5C27D9' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  <span>100</span>
                  <span>Sem limite</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              O limite conta todos os caracteres: letras, espaços, pontuação e emojis.
            </p>
          </div>
        )}
      </div>

      {/* Method selector */}
      <div>
        <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: 4, borderRadius: 10, width: 'fit-content', marginBottom: 16 }}>
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
              Mínimo 1 URL · Máximo 200 URLs · Devem começar por &quot;https://&quot;
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
      </div>

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
