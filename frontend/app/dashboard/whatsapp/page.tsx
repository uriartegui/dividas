'use client'
import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface Conversation {
  debtor_id: string
  content: string
  direction: string
  created_at: string
  debtors: { id: string; name: string; phone: string }
}

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  status: string
  created_at: string
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [campaign, setCampaign] = useState(false)
  const [campaignResult, setCampaignResult] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/whatsapp/conversations')
      setConversations(data)
    } catch {}
  }

  const loadMessages = async (debtorId: string) => {
    try {
      const { data } = await api.get(`/whatsapp/conversations/${debtorId}`)
      setMessages(data)
    } catch {}
  }

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.debtor_id)
    const interval = setInterval(() => loadMessages(selected.debtor_id), 3000)
    return () => clearInterval(interval)
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelect = (conv: Conversation) => {
    setSelected(conv)
    setMessages([])
    loadMessages(conv.debtor_id)
  }

  const handleReply = async () => {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      await api.post('/whatsapp/reply', { debtorId: selected.debtor_id, message: reply })
      setReply('')
      await loadMessages(selected.debtor_id)
      await loadConversations()
    } catch {
      alert('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const handleCampaign = async () => {
    setCampaign(true)
    setCampaignResult(null)
    try {
      const { data } = await api.post('/whatsapp/send')
      setCampaignResult(data)
      await loadConversations()
    } catch {
      alert('Erro ao disparar campanha')
    } finally {
      setCampaign(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">💬 WhatsApp</h2>
        <button
          onClick={handleCampaign}
          disabled={campaign}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {campaign ? '📤 Enviando...' : '📱 Disparar Campanha'}
        </button>
      </div>

      {campaignResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-sm text-green-400">
          ✅ {campaignResult.sent} enviado(s), {campaignResult.failed} falha(s)
        </div>
      )}

      {/* Chat layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">

        {/* Lista de conversas */}
        <div className="w-72 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-white font-semibold text-sm">Conversas</p>
            <p className="text-gray-500 text-xs">{conversations.length} contato(s)</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">Nenhuma conversa ainda.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.debtor_id}
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                    selected?.debtor_id === conv.debtor_id ? 'bg-gray-800 border-l-2 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {conv.debtors?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{conv.debtors?.name}</p>
                      <p className="text-gray-500 text-xs truncate">{conv.content}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-gray-600 text-xs">{fmt(conv.created_at)}</p>
                      {conv.direction === 'inbound' && (
                        <span className="block mt-1 w-2 h-2 rounded-full bg-green-500 ml-auto" />
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área de chat */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-gray-400 text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header do chat */}
              <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  {selected.debtors?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{selected.debtors?.name}</p>
                  <p className="text-gray-500 text-xs">{selected.debtors?.phone}</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg, i) => {
                  const isOut = msg.direction === 'outbound'
                  const showDate = i === 0 || fmtDate(messages[i - 1].created_at) !== fmtDate(msg.created_at)
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                            {fmtDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                          isOut
                            ? 'bg-green-600 text-white rounded-br-sm'
                            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOut ? 'text-green-200 text-right' : 'text-gray-500'}`}>
                            {fmt(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input de resposta */}
              <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500 placeholder-gray-500"
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl transition-colors text-sm font-semibold"
                >
                  {sending ? '...' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
