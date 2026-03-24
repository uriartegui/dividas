'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Message {
  id: string
  content: string
  status: string
  created_at: string
  sent_at: string
  debtors: { name: string; phone: string }
}

const statusColor: Record<string, string> = {
  sent: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  queued: 'bg-yellow-500/20 text-yellow-400',
  delivered: 'bg-blue-500/20 text-blue-400',
  read: 'bg-purple-500/20 text-purple-400',
}

const statusLabel: Record<string, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  queued: 'Na fila',
  delivered: 'Entregue',
  read: 'Lido',
}

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [preview, setPreview] = useState<Message | null>(null)

  const load = async () => {
    try {
      const { data } = await api.get('/whatsapp/messages')
      setMessages(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sendCampaign = async () => {
    setSending(true)
    setLastResult(null)
    try {
      const { data } = await api.post('/whatsapp/send')
      setLastResult(data)
      load()
    } catch {
      alert('Erro ao enviar campanha')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">WhatsApp</h2>
        <button
          onClick={sendCampaign}
          disabled={sending}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {sending ? '📤 Enviando...' : '📱 Disparar Campanha'}
        </button>
      </div>

      {/* Resultado */}
      {lastResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
          <p className="text-green-400 font-semibold mb-1">
            ✅ Campanha concluída — {lastResult.sent} enviado(s), {lastResult.failed} falha(s)
          </p>
          <div className="space-y-1 mt-2">
            {lastResult.results.map((r: any, i: number) => (
              <p key={i} className="text-sm text-gray-300">
                • <span className="text-white">{r.debtorName}</span> ({r.phone}) —{' '}
                <span className={r.status === 'sent' ? 'text-green-400' : 'text-red-400'}>
                  {r.status === 'sent' ? 'Enviado' : 'Falhou'}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Mensagens Enviadas</h3>
          <span className="text-gray-500 text-xs">{messages.length} mensagem(s)</span>
        </div>

        {loading ? (
          <p className="text-gray-400 p-5">Carregando...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 p-5">Nenhuma mensagem enviada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Devedor</th>
                <th className="text-left px-5 py-3">Telefone</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Enviado em</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{m.debtors?.name}</td>
                  <td className="px-5 py-3 text-gray-400">{m.debtors?.phone}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[m.status] || 'bg-gray-700 text-gray-300'}`}>
                      {statusLabel[m.status] || m.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setPreview(m)}
                      className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    >
                      Ver mensagem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Mensagem enviada</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[preview.status]}`}>
                {statusLabel[preview.status]}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-4">{preview.debtors?.name} — {preview.debtors?.phone}</p>
            <div className="bg-green-900/30 border border-green-800/50 rounded-xl p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans">{preview.content}</pre>
            </div>
            <button
              onClick={() => setPreview(null)}
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
