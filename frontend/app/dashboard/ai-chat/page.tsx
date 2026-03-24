'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Debt {
  id: string; description: string; current_amount: number; status: string
  debtors: { name: string }
}
interface Message {
  role: 'agent' | 'user'; message: string
}
interface ChatState {
  callId: string; debtorName: string; amount: number
  stepKey: string; message: string; options: string[]; terminal: boolean; outcome: string | null
  history: Message[]
}

const optionLabel: Record<string, string> = {
  sim: '✅ Sim, quero pagar', nao: '❌ Não tenho condições',
  ja_paguei: '💰 Já paguei', parcelar: '📋 Quero parcelar',
  '3x': '3x (3 parcelas)', '6x': '6x (6 parcelas)', nenhuma: '🔙 Nenhuma das opções',
}

export default function AiChatPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [selectedDebt, setSelectedDebt] = useState('')
  const [chat, setChat] = useState<ChatState | null>(null)
  const [loading, setLoading] = useState(false)
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    api.get('/debts', { params: { status: 'pending', limit: 100 } })
      .then(r => setDebts(r.data.data?.filter((d: Debt) => d.status === 'pending') || []))
      .catch(() => {})
  }, [])

  const startChat = async () => {
    if (!selectedDebt) return
    setLoading(true)
    try {
      const { data } = await api.post('/ai/start', { debtId: selectedDebt })
      setChat({ ...data, history: [{ role: 'agent', message: data.message }] })
    } finally { setLoading(false) }
  }

  const reply = async (option: string) => {
    if (!chat) return
    setReplying(true)
    try {
      const { data } = await api.post('/ai/reply', { callId: chat.callId, userInput: option })
      setChat({
        ...chat,
        stepKey: data.stepKey,
        message: data.message,
        options: data.options,
        terminal: data.terminal,
        outcome: data.outcome,
        history: data.history,
      })
    } finally { setReplying(false) }
  }

  const reset = () => { setChat(null); setSelectedDebt('') }

  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const outcomeColor: Record<string, string> = {
    accepted: 'text-green-400', already_paid: 'text-blue-400',
    wants_installment: 'text-purple-400', callback_requested: 'text-yellow-400',
  }
  const outcomeLabel: Record<string, string> = {
    accepted: '✅ Pagamento aceito!', already_paid: '💰 Já está pago!',
    wants_installment: '📋 Parcelamento acordado!', callback_requested: '📅 Retorno agendado',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">🤖 Chat IA — Simulação de Negociação</h2>

      {!chat ? (
        <div className="max-w-lg">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm mb-4">
              Selecione uma dívida pendente para simular como a IA negocia com o devedor. 
              Você verá o fluxo completo da conversa.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Dívida Pendente</label>
                <select value={selectedDebt} onChange={e => setSelectedDebt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Selecione uma dívida...</option>
                  {debts.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.debtors?.name} — {d.description} ({fmt(d.current_amount)})
                    </option>
                  ))}
                </select>
              </div>
              {debts.length === 0 && (
                <p className="text-yellow-500 text-xs">Nenhuma dívida pendente encontrada. Cadastre dívidas com status "Pendente".</p>
              )}
              <button onClick={startChat} disabled={!selectedDebt || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                {loading ? 'Iniciando...' : '▶ Iniciar Conversa'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* Header do chat */}
          <div className="bg-gray-900 border border-gray-800 rounded-t-xl px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">{chat.debtorName}</p>
              <p className="text-gray-400 text-xs">{fmt(chat.amount)} em aberto</p>
            </div>
            <button onClick={reset} className="text-gray-500 hover:text-white text-sm transition-colors">✕ Encerrar</button>
          </div>

          {/* Histórico */}
          <div className="bg-gray-950 border-x border-gray-800 px-5 py-4 space-y-3 min-h-64 max-h-96 overflow-y-auto">
            {chat.history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                  msg.role === 'agent'
                    ? 'bg-gray-800 text-white rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {msg.role === 'agent' && <span className="block text-xs text-gray-400 mb-1">🤖 Agente IA</span>}
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          {/* Opções ou resultado final */}
          <div className="bg-gray-900 border border-gray-800 rounded-b-xl px-5 py-4">
            {chat.terminal ? (
              <div className="text-center py-2">
                <p className={`text-lg font-bold ${outcomeColor[chat.outcome || ''] || 'text-white'}`}>
                  {outcomeLabel[chat.outcome || ''] || 'Conversa encerrada'}
                </p>
                <p className="text-gray-500 text-sm mt-1">A dívida foi atualizada automaticamente.</p>
                <button onClick={reset} className="mt-4 bg-gray-800 hover:bg-gray-700 text-white text-sm px-6 py-2 rounded-lg transition-colors">
                  Nova Conversa
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs mb-2">Responda como o devedor:</p>
                {chat.options.map(opt => (
                  <button key={opt} onClick={() => reply(opt)} disabled={replying}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 hover:border-blue-500 text-white text-sm px-4 py-2.5 rounded-lg transition-colors">
                    {optionLabel[opt] || opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
