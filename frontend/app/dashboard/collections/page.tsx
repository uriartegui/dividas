'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface CallResult {
  id: string
  outcome: string
  duration_sec: number
  transcript: string
  initiated_at: string
  ai_used: boolean
  debtors: { name: string; phone: string }
  debts: { description: string; current_amount: number }
}

const outcomeLabel: Record<string, string> = {
  accepted: 'Aceitou',
  refused: 'Recusou',
  wants_installment: 'Quer Parcelar',
  no_answer: 'Não Atendeu',
  already_paid: 'Já Pagou',
  callback_requested: 'Pediu Retorno',
}

const outcomeColor: Record<string, string> = {
  accepted: 'bg-green-500/20 text-green-400',
  refused: 'bg-red-500/20 text-red-400',
  wants_installment: 'bg-purple-500/20 text-purple-400',
  no_answer: 'bg-gray-500/20 text-gray-400',
  already_paid: 'bg-blue-500/20 text-blue-400',
  callback_requested: 'bg-yellow-500/20 text-yellow-400',
}

export default function CollectionsPage() {
  const [calls, setCalls] = useState<CallResult[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [selected, setSelected] = useState<CallResult | null>(null)

  const load = async () => {
    try {
      const { data } = await api.get('/collections/calls')
      setCalls(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const runCollection = async () => {
    setRunning(true)
    setLastResult(null)
    try {
      const { data } = await api.post('/collections/run')
      setLastResult(data)
      load()
    } catch {
      alert('Erro ao executar cobrança')
    } finally {
      setRunning(false)
    }
  }

  const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Cobranças</h2>
        <button
          onClick={runCollection}
          disabled={running}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {running ? '⚡ Executando...' : '▶ Executar Cobrança'}
        </button>
      </div>

      {/* Resultado do último run */}
      {lastResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold mb-2">
            ✅ {lastResult.processed} dívida(s) processada(s)
          </p>
          <div className="space-y-1">
            {lastResult.results.map((r: any, i: number) => (
              <p key={i} className="text-sm text-gray-300">
                • <span className="text-white">{r.debtorName}</span> — {fmt(r.amount)} —{' '}
                <span className={outcomeColor[r.outcome]?.split(' ')[1]}>
                  {outcomeLabel[r.outcome] || r.outcome}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">Histórico de Chamadas</h3>
        </div>

        {loading ? (
          <p className="text-gray-400 p-5">Carregando...</p>
        ) : calls.length === 0 ? (
          <p className="text-gray-400 p-5">Nenhuma chamada registrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Devedor</th>
                <th className="text-left px-5 py-3">Dívida</th>
                <th className="text-left px-5 py-3">Outcome</th>
                <th className="text-left px-5 py-3">Duração</th>
                <th className="text-left px-5 py-3">Data</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{c.debtors?.name}</td>
                  <td className="px-5 py-3 text-gray-400">{fmt(c.debts?.current_amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${outcomeColor[c.outcome] || 'bg-gray-700 text-gray-300'}`}>
                      {outcomeLabel[c.outcome] || c.outcome}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {c.duration_sec ? `${c.duration_sec}s` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(c.initiated_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setSelected(c)}
                      className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    >
                      Transcrição
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal transcrição */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Transcrição</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${outcomeColor[selected.outcome]}`}>
                {outcomeLabel[selected.outcome]}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-3">{selected.debtors?.name} — {fmt(selected.debts?.current_amount)}</p>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
              {selected.transcript}
            </pre>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
