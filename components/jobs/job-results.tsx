'use client'

import { useState } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'

interface Keyword {
  keyword: string
  searchVolume: number
  difficulty: number
  selected: boolean
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

export function JobResults({ results }: JobResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50'
      case 'PROCESSING':
        return 'bg-blue-50'
      case 'FAILED':
        return 'bg-red-50'
      default:
        return 'bg-yellow-50'
    }
  }

  return (
    <div className="space-y-4">
      {results.map(result => (
        <div key={result.id} className={`border border-gray-200 rounded-lg overflow-hidden ${getStatusColor(result.status)}`}>
          {/* Header */}
          <button
            onClick={() => toggleExpanded(result.id)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-75 transition"
          >
            <div className="flex items-center gap-4 flex-1 text-left">
              <ChevronDown
                size={20}
                className={`transition ${expandedResults.has(result.id) ? 'rotate-180' : ''}`}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 truncate">{result.url}</p>
                <p className={`text-xs mt-1 ${
                  result.status === 'COMPLETED' ? 'text-green-600' :
                  result.status === 'PROCESSING' ? 'text-blue-600' :
                  result.status === 'FAILED' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {result.status}
                </p>
              </div>
            </div>
            {result.keywords && (
              <span className="text-sm font-medium text-gray-600">
                {result.keywords.length} keywords
              </span>
            )}
          </button>

          {/* Details */}
          {expandedResults.has(result.id) && (
            <div className="border-t border-gray-200 px-6 py-4 space-y-6">
              {/* Error message */}
              {result.status === 'FAILED' && result.error && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <h3 className="font-semibold text-red-800 mb-1">Erro na análise</h3>
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}

              {/* Keywords Table */}
              {result.keywords && result.keywords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Keywords (Top 10)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Keyword</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Volume</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Dificuldade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.keywords.slice(0, 10).map((kw, idx) => (
                          <tr key={idx} className="border-b hover:bg-white/50">
                            <td className="px-3 py-2 text-gray-900">{kw.keyword}</td>
                            <td className="px-3 py-2 text-gray-600">{kw.searchVolume}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${kw.difficulty}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">{kw.difficulty}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Intro Text */}
              {result.introText && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Texto Intro</h3>
                  <div className="bg-white rounded border border-gray-200 p-4 relative group">
                    <p className="text-sm text-gray-700 pr-10">{result.introText}</p>
                    <button
                      onClick={() => copyToClipboard(result.introText || '', `intro-${result.id}`)}
                      className="absolute top-2 right-2 p-2 bg-gray-100 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedId === `intro-${result.id}` ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Outro Text */}
              {result.outroText && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Texto Outro</h3>
                  <div className="bg-white rounded border border-gray-200 p-4 relative group">
                    <p className="text-sm text-gray-700 pr-10">{result.outroText}</p>
                    <button
                      onClick={() => copyToClipboard(result.outroText || '', `outro-${result.id}`)}
                      className="absolute top-2 right-2 p-2 bg-gray-100 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedId === `outro-${result.id}` ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} className="text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
