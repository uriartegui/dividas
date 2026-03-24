'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Debt {
  id: string
  description: string
  current_amount: number
  due_date: string
  status: string
  debtors: { name: string; phone: string }
}

interface Debtor {
  id: string
  name: string
}

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  negotiating: 'Negociando',
  agreed: 'Acordado',
  paid: 'Pago',
  cancelled: 'Cancelado',
}

const statusColor: Record<string, string> = {
  pending: 'text-yellow-400',
  negotiating: 'text-blue-400',
  agreed: 'text-purple-400',
  paid: 'text-green-400',
  cancelled: 'text-gray-500',
}

const empty = { debtor_id: '', description: '', original_amount: '', due_date: '' }

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [debtsRes, debtorsRes] = await Promise.all([
        api.get('/debts'),
        api.get('/debtors'),
      ])
      setDebts(debtsRes.data)
      setDebtors(debtorsRes.data)
    } catch {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/debts', {
        ...form,
        original_amount: parseFloat(form.original_amount),
      })
      setForm(empty)
      setShowModal(false)
      load()
    } catch {
      setError('Erro ao salvar dívida')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (id: string, status: string) => {
    await api.patch(`/debts/${id}/status`, { status })
    load()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Dívidas</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Nova Dívida
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : debts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Nenhuma dívida cadastrada.</p>
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
                  <td className="px-5 py-3">
                    <span className={`font-medium ${statusColor[d.status]}`}>
                      {statusLabel[d.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <select
                      value={d.status}
                      onChange={e => handleStatus(d.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
                    >
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Nova Dívida</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Devedor *</label>
                <select
                  value={form.debtor_id}
                  onChange={e => setForm({ ...form, debtor_id: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {debtors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.original_amount}
                  onChange={e => setForm({ ...form, original_amount: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vencimento *</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(empty) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
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
