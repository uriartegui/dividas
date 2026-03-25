'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Debt {
  id: string; description: string; current_amount: number; due_date: string; status: string
  debtors: { name: string; phone: string }
}
interface Debtor { id: string; name: string }

const statusLabel: Record<string, string> = {
  pending: 'Pendente', negotiating: 'Negociando', agreed: 'Acordado', paid: 'Pago', cancelled: 'Cancelado',
}
const statusColor: Record<string, string> = {
  pending: 'text-yellow-400', negotiating: 'text-blue-400', agreed: 'text-purple-400',
  paid: 'text-green-400', cancelled: 'text-gray-500',
}
const empty = { debtor_id: '', description: '', original_amount: '', due_date: '' }

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const limit = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [debtsRes, debtorsRes] = await Promise.all([
        api.get('/debts', { params: { status: statusFilter || undefined, search, page, limit } }),
        api.get('/debtors', { params: { limit: 100 } }),
      ])
      setDebts(debtsRes.data.data)
      setTotal(debtsRes.data.total)
      setDebtors(debtorsRes.data.data)
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [statusFilter, search, page])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); setPage(1); setSearch(searchInput)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await api.post('/debts', { ...form, original_amount: parseFloat(form.original_amount) })
      setForm(empty); setShowModal(false); load()
      toast.success('Dívida cadastrada com sucesso!')
    } catch { toast.error('Erro ao salvar dívida') }
    finally { setSaving(false) }
  }

  const handleStatus = async (id: string, status: string) => {
    await api.patch(`/debts/${id}/status`, { status })
    toast.success('Status atualizado!')
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Dívidas <span className="text-gray-500 text-base font-normal">({total})</span></h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast('Exportando Excel...', { icon: '📥' })
              const res = await api.get('/export/debts', { responseType: 'blob' })
              const url = URL.createObjectURL(new Blob([res.data]))
              const a = document.createElement('a')
              a.href = url; a.download = 'dividas.xlsx'; a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            📥 Exportar Excel
          </button>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nova Dívida
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input type="text" placeholder="Buscar descrição..." value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">Buscar</button>
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1) }}
            className="text-gray-400 hover:text-white text-sm px-3">✕</button>
        )}
      </div>

      {loading ? <p className="text-gray-400">Carregando...</p> : debts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Nenhuma dívida encontrada.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Devedor</th>
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-5 py-3">Valor</th>
                <th className="text-left px-5 py-3">Vencimento</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d) => (
                <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{d.debtors?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{d.description}</td>
                  <td className="px-5 py-3 text-white">{fmt(d.current_amount)}</td>
                  <td className="px-5 py-3 text-gray-400">{new Date(d.due_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3"><span className={`font-medium ${statusColor[d.status]}`}>{statusLabel[d.status]}</span></td>
                  <td className="px-5 py-3 text-right">
                    <select value={d.status} onChange={e => handleStatus(d.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none">
                      {Object.entries(statusLabel).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500 text-sm">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">← Anterior</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">Próxima →</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Nova Dívida</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Devedor *</label>
                <select value={form.debtor_id} onChange={e => setForm({ ...form, debtor_id: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Selecione...</option>
                  {debtors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {[
                { label: 'Descrição *', key: 'description', type: 'text', required: true },
                { label: 'Valor (R$) *', key: 'original_amount', type: 'number', required: true },
                { label: 'Vencimento *', key: 'due_date', type: 'date', required: true },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} step={type === 'number' ? '0.01' : undefined}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })} required={required}
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
