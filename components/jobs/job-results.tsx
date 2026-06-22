'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Copy, Check, AlertTriangle, CheckCircle2, Loader2, Clock } from 'lucide-react'

interface Keyword {
  keyword: string
  searchVolume: number
  difficulty: number
}

interface JobResult {
  id: string
  url: string
  status: string
  keywords: Keyword[] | null
  introText: string | null
  outroText: string | null
  error: string | null
}

interface JobResultsProps {
  results: JobResult[]
}

// Wrap occurrences of the given keywords in <strong>, case-insensitive.
function highlightKeywords(text: string, keywords: string[]): ReactNode[] {
  const valid = keywords.map(k => k.trim()).filter(Boolean)
  if (valid.length === 0) return [text]

  // Longer keywords first so they win over substrings; escape regex chars.
  const escaped = valid
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts = text.split(regex)
  return parts.map((part, i) => {
    const isMatch = valid.some(k => k.toLowerCase() === part.toLowerCase())
    return isMatch ? (
      <strong key={i} style={{ color: '#5C27D9', fontWeight: 700 }}>{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  })
}

const STATUS_META: Record<string, { icon: ReactNode; label: string; color: string; bg: string }> = {
  COMPLETED:  { icon: <CheckCircle2 size={18} />, label: 'Concluído',   color: '#16a34a', bg: '#f0fdf4' },
  PROCESSING: { icon: <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />, label: 'A processar', color: '#5C27D9', bg: '#f5f3ff' },
  FAILED:     { icon: <AlertTriangle size={18} />, label: 'Falhou',     color: '#dc2626', bg: '#fef2f2' },
  PENDING:    { icon: <Clock size={18} />,         label: 'Não processada', color: '#9ca3af', bg: '#f9fafb' },
}

export function JobResults({ results }: JobResultsProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(results.filter(r => r.status === 'COMPLETED').slice(0, 1).map(r => r.id))
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {results.map(result => {
        const meta = STATUS_META[result.status] || STATUS_META.PENDING
        const isOpen = expanded.has(result.id)
        const introKws = (result.keywords ?? []).slice(0, 2).map(k => k.keyword)
        const outroKws = (result.keywords ?? []).slice(2, 5).map(k => k.keyword)

        return (
          <div key={result.id} style={{
            background: 'white',
            border: '1px solid #ede9fe',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(92,39,217,0.05)',
          }}>
            {/* Header */}
            <button
              onClick={() => toggle(result.id)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <ChevronDown
                size={18}
                style={{ color: '#9ca3af', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
              />
              <span style={{ color: meta.color, display: 'flex', flexShrink: 0 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {result.url}
                </p>
                <span style={{ fontSize: 12, color: meta.color, fontWeight: 500 }}>{meta.label}</span>
              </div>
              {result.status === 'COMPLETED' && result.keywords && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#5C27D9',
                  background: '#f5f3ff', padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                }}>
                  {result.keywords.length} keywords
                </span>
              )}
            </button>

            {/* Body */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #f3f4f6', padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Error */}
                {result.status === 'FAILED' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', margin: 0 }}>Não foi possível analisar esta página</h3>
                    </div>
                    <p style={{ fontSize: 13, color: '#b91c1c', margin: 0, lineHeight: 1.6 }}>
                      {result.error || 'Ocorreu um erro desconhecido durante a análise.'}
                    </p>
                  </div>
                )}

                {/* Keywords table */}
                {result.keywords && result.keywords.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                      Keywords selecionadas
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#faf8ff' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Keyword</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Volume/mês</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Dificuldade</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Usada em</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.keywords.map((kw, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 12px', color: '#1a1a2e', fontWeight: 500 }}>{kw.keyword}</td>
                              <td style={{ padding: '8px 12px', color: '#374151' }}>{kw.searchVolume.toLocaleString('pt-PT')}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 56, height: 6, background: '#ede9fe', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ width: `${kw.difficulty}%`, height: '100%', background: kw.difficulty > 60 ? '#dc2626' : kw.difficulty > 35 ? '#f59e0b' : '#16a34a', borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>{kw.difficulty}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: idx < 2 ? '#5C27D9' : '#7c3aed' }}>
                                  {idx < 2 ? 'Intro' : 'Outro'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Intro text */}
                {result.introText && (
                  <TextBlock
                    title="Texto de introdução"
                    subtitle="Usa as 2 keywords principais (a roxo)"
                    text={result.introText}
                    keywords={introKws}
                    copied={copiedId === `intro-${result.id}`}
                    onCopy={() => copy(result.introText || '', `intro-${result.id}`)}
                  />
                )}

                {/* Outro text */}
                {result.outroText && (
                  <TextBlock
                    title="Texto de fecho"
                    subtitle="Usa as restantes keywords (a roxo)"
                    text={result.outroText}
                    keywords={outroKws}
                    copied={copiedId === `outro-${result.id}`}
                    onCopy={() => copy(result.outroText || '', `outro-${result.id}`)}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TextBlock({
  title, subtitle, text, keywords, copied, onCopy,
}: {
  title: string; subtitle: string; text: string; keywords: string[]; copied: boolean; onCopy: () => void
}) {
  const wordCount = text.trim().split(/\s+/).length
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0, display: 'inline' }}>{title}</h3>
          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{subtitle}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{wordCount} palavras</span>
      </div>
      <div style={{ position: 'relative', background: '#faf8ff', border: '1px solid #ede9fe', borderRadius: 10, padding: '16px 48px 16px 16px' }}>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>
          {highlightKeywords(text, keywords)}
        </p>
        <button
          onClick={onCopy}
          title="Copiar texto"
          style={{
            position: 'absolute', top: 10, right: 10,
            padding: 8, background: 'white', border: '1px solid #ede9fe', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {copied ? <Check size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} style={{ color: '#7c3aed' }} />}
        </button>
      </div>
    </div>
  )
}
