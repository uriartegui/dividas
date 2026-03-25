'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast, { Toaster } from 'react-hot-toast'

const DEFAULT_TEMPLATES = {
  1: 'Olá, *{nome}*! 👋 Sua dívida de *{valor}* venceu ontem. Regularize agora para evitar juros.',
  7: 'Olá, *{nome}*! ⚠️ Sua dívida de *{valor}* está em atraso há 7 dias. Entre em contato para negociar.',
  30: 'Olá, *{nome}*! 🔴 Sua dívida de *{valor}* está em atraso há 30 dias. Risco de negativação no Serasa.',
}

const PRESETS = [1, 7, 30]

type Rule = {
  id: string
  days_after_due: number
  message_template: string
  active: boolean
}

export default function CollectionRulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRules() }, [])

  async function loadRules() {
    try {
      const { data } = await api.get('/collection-rules')
      setRules(data)
    } catch { } finally { setLoading(false) }
  }

  function getRule(days: number) {
    return rules.find(r => r.days_after_due === days)
  }

  async function toggleRule(days: number) {
    const rule = getRule(days)
    if (rule) {
      await api.put(`/collection-rules/${rule.id}`, { ...rule, active: !rule.active })
      toast.success(rule.active ? 'Regra desativada' : 'Regra ativada')
    } else {
      await api.post('/collection-rules', {
        days_after_due: days,
        message_template: DEFAULT_TEMPLATES[days as keyof typeof DEFAULT_TEMPLATES],
        active: true,
      })
      toast.success(`Regra D+${days} criada!`)
    }
    loadRules()
  }

  async function saveTemplate(days: number, template: string) {
    const rule = getRule(days)
    if (rule) {
      await api.put(`/collection-rules/${rule.id}`, { ...rule, message_template: template })
      toast.success('Mensagem salva!')
      loadRules()
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8">
      <Toaster />
      <h1 className="text-2xl font-bold text-white mb-2">⚙️ Régua de Cobrança</h1>
      <p className="text-gray-400 mb-8">Configure mensagens automáticas por WhatsApp após o vencimento. Disparadas todo dia às 08h.</p>

      <div className="space-y-6">
        {PRESETS.map(days => {
          const rule = getRule(days)
          const active = rule?.active ?? false
          const template = rule?.message_template ?? DEFAULT_TEMPLATES[days as keyof typeof DEFAULT_TEMPLATES]

          return (
            <div key={days} className={`bg-gray-800 rounded-xl p-6 border ${active ? 'border-green-500/50' : 'border-gray-700'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold text-lg">D+{days}</h2>
                  <p className="text-gray-400 text-sm">{days === 1 ? '1 dia' : `${days} dias`} após o vencimento</p>
                </div>
                <button
                  onClick={() => toggleRule(days)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Mensagem — use <code className="text-blue-400">{'{nome}'}</code>, <code className="text-blue-400">{'{valor}'}</code>, <code className="text-blue-400">{'{vencimento}'}</code>, <code className="text-blue-400">{'{dias}'}</code>
                </label>
                <textarea
                  defaultValue={template}
                  rows={3}
                  disabled={!active}
                  onBlur={(e) => rule && saveTemplate(days, e.target.value)}
                  className="w-full bg-gray-900 text-white rounded-lg p-3 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-medium mb-2">ℹ️ Como funciona</h3>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• Todo dia às <strong className="text-white">08:00</strong> o sistema verifica dívidas vencidas</li>
          <li>• Envia WhatsApp para devedores cujo vencimento foi há exatamente D+1, D+7 ou D+30 dias</li>
          <li>• Não envia duplicatas — máximo 1 mensagem por devedor por dia</li>
          <li>• Só envia para dívidas com status <strong className="text-white">Pendente</strong> ou <strong className="text-white">Em negociação</strong></li>
        </ul>
      </div>
    </div>
  )
}
