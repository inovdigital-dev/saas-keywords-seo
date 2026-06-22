'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Upload, Loader } from 'lucide-react'

interface NewJobFormProps {
  onSuccess: () => void
}

export function NewJobForm({ onSuccess }: NewJobFormProps) {
  const { user } = useAuth()
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste')
  const [urls, setUrls] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseUrls = (text: string): string[] => {
    return text
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'))
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
    setIsLoading(true)

    try {
      let urlsToProcess: string[] = []

      if (inputMethod === 'paste') {
        urlsToProcess = parseUrls(urls)
      } else if (file) {
        const text = await file.text()
        urlsToProcess = parseUrls(text)
      }

      if (urlsToProcess.length === 0) {
        setError('Nenhuma URL válida encontrada')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlsToProcess,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar job')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {/* Input method selector */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="paste"
            checked={inputMethod === 'paste'}
            onChange={(e) => setInputMethod(e.target.value as 'paste' | 'upload')}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Colar URLs</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="upload"
            checked={inputMethod === 'upload'}
            onChange={(e) => setInputMethod(e.target.value as 'paste' | 'upload')}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Upload CSV/TXT</span>
        </label>
      </div>

      {/* Paste URLs */}
      {inputMethod === 'paste' && (
        <div>
          <label className="block text-sm font-medium mb-2">URLs (uma por linha)</label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://exemplo.com/page1&#10;https://exemplo.com/page2&#10;https://exemplo.com/page3"
            className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 1 URL, máximo 50 URLs</p>
        </div>
      )}

      {/* Upload file */}
      {inputMethod === 'upload' && (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition flex flex-col items-center gap-2 cursor-pointer"
          >
            <Upload size={24} className="text-gray-400" />
            <span className="text-sm font-medium">Clique para selecionar ou arraste um arquivo</span>
            <span className="text-xs text-gray-500">.csv ou .txt</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && <p className="mt-2 text-sm text-green-600">✓ {file.name}</p>}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || (inputMethod === 'paste' ? !urls.trim() : !file)}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium flex items-center justify-center gap-2"
      >
        {isLoading && <Loader size={18} className="animate-spin" />}
        {isLoading ? 'Processando...' : 'Iniciar Análise'}
      </button>
    </form>
  )
}
