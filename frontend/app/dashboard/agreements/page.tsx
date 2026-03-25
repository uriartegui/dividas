'use client'
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Installment {
  id: string; installment_num: number; amount: number; due_date: string; paid_at: string | null; paid_amount: number | null
}
interface Agreement {
  id: string; total_amount: number; installments: number; first_due_date: string; status: string; discount_pct: number; channel: string
  debtors: { name: string; phone: string }
  debts: { description: string; original_amount: number }
  installment_list?: Installment[]
}

const statusLabel: Record<string, string> = {
  active: 'Ativo', fulfilled: 'Quitado', broken: 'Quebrado', cancelled: 'Cancelado',
}
const statusColor: Record<string, string> = {
  active: 'text-blue-400', fulfilled: 'text-green-400', broken: 'text-red-400', cancelled: 'text-gray-500',
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Agreement | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const limit = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/agreements', { params: { status: statusFilter || undefined, page, limit } })
      setAgreements(data.data)
      setTotal(data.total)
    } catch { toast.error('Erro ao carregar acordos') }
    finally { setLoading(false) }
  }, [statusFilter, page])

  useEffect(() => { load() }, [load])

  const openDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const { data } = await api.get(`/agreements/${id}`)
      setSelected(data)
    } finally { setLoadingDetail(false) }
  }

  const markPaid = async (installmentId: string) => {
    await api.patch(`/agreements/installments/${installmentId}/pay`, {})
    toast.success('Parcela marcada como paga!')
    if (selected) openDetail(selected.id)
  }

  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Acordos <span className="text-gray-500 text-base font-normal">({total})</span></h2>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400">Carregando...</p> : agreements.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-gray-400">Nenhum acordo encontrado.</p>
          <p className="text-gray-600 text-sm mt-1">Acordos são criados automaticamente via Chat IA ou Cobranças.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Devedor</th>
                <th className="text-left px-5 py-3">Dívida</th>
                <th className="text-left px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Parcelas</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => (
                <tr key={a.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{a.debtors?.name || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{a.debts?.description || '—'}</td>
                  <td className="px-5 py-3 text-white">{fmt(a.total_amount)}</td>
                  <td className="px-5 py-3 text-gray-400">{a.installments}x de {fmt(a.total_amount / a.installments)}</td>
                  <td className="px-5 py-3">
                    <span className={`font-medium ${statusColor[a.status]}`}>{statusLabel[a.status]}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openDetail(a.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                      Ver parcelas
                    </button>
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

      {/* Modal de parcelas */}
      {(selected || loadingDetail) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            {loadingDetail ? (
              <p className="text-gray-400 text-center py-8">Carregando...</p>
            ) : selected && (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg">{selected.debtors?.name}</h3>
                    <p className="text-gray-400 text-sm">{selected.debts?.description}</p>
                    <p className="text-blue-400 text-sm font-semibold mt-1">
                      {fmt(selected.total_amount)} em {selected.installments}x
                      {selected.discount_pct > 0 && <span className="text-green-400 ml-2">(-{selected.discount_pct}% desconto)</span>}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>

                <div className="overflow-auto flex-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="text-left py-2">Parcela</th>
                        <th className="text-left py-2">Vencimento</th>
                        <th className="text-left py-2">Valor</th>
                        <th className="text-left py-2">Situação</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.installment_list || []).map((inst) => (
                        <tr key={inst.id} className="border-b border-gray-800">
                          <td className="py-2 text-gray-300">{inst.installment_num}ª</td>
                          <td className="py-2 text-gray-400">{new Date(inst.due_date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 text-white">{fmt(inst.amount)}</td>
                          <td className="py-2">
                            {inst.paid_at
                              ? <span className="text-green-400 text-xs">✓ Pago em {new Date(inst.paid_at).toLocaleDateString('pt-BR')}</span>
                              : <span className="text-yellow-400 text-xs">Pendente</span>}
                          </td>
                          <td className="py-2 text-right">
                            {!inst.paid_at && (
                              <button onClick={() => markPaid(inst.id)}
                                className="text-green-400 hover:text-green-300 text-xs transition-colors">
                                Marcar pago
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
