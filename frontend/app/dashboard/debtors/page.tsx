'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import api from '@/lib/api'

interface Debtor {
  id: string; name: string; cpf: string; email: string; phone: string; active: boolean
}

interface ImportResult {
  message: string
  inserted: number
  skipped: number
  errors: { linha: number; erro: string }[]
}

const empty = { name: '', cpf: '', email: '', phone: '', notes: '' }

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // CSV Import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImportResult, setShowImportResult] = useState(false)

  const limit = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/debtors', { params: { search, page, limit } })
      setDebtors(data.data)
      setTotal(data.total)
    } catch {
      setError('Erro ao carregar devedores')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post('/debtors', form)
      setForm(empty); setShowModal(false); load()
    } catch { setError('Erro ao salvar devedor') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover devedor?')) return
    await api.delete(`/debtors/${id}`)
    load()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/debtors/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportResult(data)
      setShowImportResult(true)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao importar CSV'
      setImportResult({ message: msg, inserted: 0, skipped: 0, errors: [] })
      setShowImportResult(true)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Devedores <span className="text-gray-500 text-base font-normal">({total})</span>
        </h2>
        <div className="flex gap-2">
          {/* Botão Import CSV */}
          <label className={`cursor-pointer flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? '⏳ Importando...' : '📂 Importar CSV'}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
          </label>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Novo Devedor
          </button>
        </div>
      </div>

      {/* Resultado do Import */}
      {showImportResult && importResult && (
        <div className={`mb-4 p-4 rounded-xl border ${importResult.inserted > 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-semibold mb-1">{importResult.message}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-400">✓ {importResult.inserted} inseridos</span>
                {importResult.skipped > 0 && <span className="text-yellow-400">⚠ {importResult.skipped} ignorados</span>}
                {importResult.errors.length > 0 && <span className="text-red-400">✕ {importResult.errors.length} erros</span>}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {importResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-300">Linha {e.linha}: {e.erro}</p>
                  ))}
                  {importResult.errors.length > 5 && (
                    <p className="text-xs text-red-300">...e mais {importResult.errors.length - 5} erros</p>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowImportResult(false)} className="text-gray-400 hover:text-white text-lg leading-none ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Dica de formato CSV */}
      <div className="mb-4 p-3 bg-gray-900 border border-gray-800 rounded-lg">
        <p className="text-xs text-gray-500">
          📋 <strong className="text-gray-400">Formato do CSV:</strong> cabeçalho com colunas{' '}
          <code className="bg-gray-800 px-1 rounded text-gray-300">nome</code>,{' '}
          <code className="bg-gray-800 px-1 rounded text-gray-300">cpf</code>,{' '}
          <code className="bg-gray-800 px-1 rounded text-gray-300">email</code>,{' '}
          <code className="bg-gray-800 px-1 rounded text-gray-300">telefone</code> — apenas nome é obrigatório.
        </p>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, CPF, telefone..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">Buscar</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} className="text-gray-400 hover:text-white text-sm px-3">✕ Limpar</button>
        )}
      </form>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : debtors.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">{search ? 'Nenhum resultado encontrado.' : 'Nenhum devedor cadastrado.'}</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">CPF</th>
                <th className="text-left px-5 py-3">Telefone</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((d) => (
                <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{d.name}</td>
                  <td className="px-5 py-3 text-gray-400">{d.cpf || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{d.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{d.email || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500 text-sm">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
              ← Anterior
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal Novo Devedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Novo Devedor</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Nome *', key: 'name', type: 'text', required: true },
                { label: 'CPF', key: 'cpf', type: 'text', required: false },
                { label: 'Email', key: 'email', type: 'email', required: false },
                { label: 'Telefone', key: 'phone', type: 'text', required: false },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} value={form[key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(empty) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
