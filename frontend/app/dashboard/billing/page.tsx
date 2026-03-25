'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface PlansResponse {
  plans: Record<string, { name: string; amount: number }>
  current: string
  expiresAt: string | null
}

export default function BillingPage() {
  const [data, setData] = useState<PlansResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('success')) toast.success('Assinatura ativada com sucesso! 🎉')
    if (searchParams.get('cancelled')) toast.error('Checkout cancelado.')
    api.get('/stripe/plans').then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [])

  const handleCheckout = async (plan: string) => {
    setCheckingOut(plan)
    try {
      const { data: res } = await api.post('/stripe/checkout', { plan })
      window.location.href = res.url
    } catch {
      toast.error('Erro ao iniciar checkout')
      setCheckingOut(null)
    }
  }

  const handlePortal = async () => {
    setOpeningPortal(true)
    try {
      const { data: res } = await api.post('/stripe/portal')
      window.location.href = res.url
    } catch {
      toast.error('Nenhuma assinatura ativa para gerenciar')
      setOpeningPortal(false)
    }
  }

  const planDetails: Record<string, { desc: string; features: string[]; color: string }> = {
    basic: {
      desc: 'Para clínicas pequenas',
      color: 'border-blue-600',
      features: ['Até 500 devedores', 'Import CSV', 'Export Excel', 'Cobranças automáticas', 'Suporte por email'],
    },
    pro: {
      desc: 'Para clínicas em crescimento',
      color: 'border-purple-500',
      features: ['Devedores ilimitados', 'Tudo do Basic', 'Chat IA avançado', 'WhatsApp real', 'Relatórios avançados', 'Suporte prioritário'],
    },
    enterprise: {
      desc: 'Para grandes operações',
      color: 'border-yellow-400',
      features: ['Tudo do Pro', 'Multi-usuário', 'API personalizada', 'SLA garantido', 'Gerente de conta dedicado'],
    },
  }

  if (loading) return <p className="text-gray-400">Carregando planos...</p>
  if (!data) return null

  const isTrial = data.current === 'trial'

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Planos e Assinatura</h2>
          <p className="text-gray-400 text-sm mt-1">
            Plano atual: <span className="text-white font-semibold capitalize">{data.current}</span>
            {isTrial && <span className="ml-2 text-yellow-400 text-xs">— Faça upgrade para desbloquear todos os recursos</span>}
          </p>
        </div>
        {!isTrial && (
          <button
            onClick={handlePortal}
            disabled={openingPortal}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {openingPortal ? 'Abrindo...' : '⚙️ Gerenciar assinatura'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(data.plans).map(([key, plan]) => {
          const detail = planDetails[key]
          const isCurrent = data.current === key
          const isPopular = key === 'pro'

          return (
            <div key={key} className={`relative bg-gray-900 border-2 rounded-2xl p-6 flex flex-col ${isCurrent ? detail.color : 'border-gray-800'}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  PLANO ATUAL
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-white font-bold text-xl">{plan.name}</h3>
                <p className="text-gray-400 text-sm">{detail.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">R$ {plan.amount}</span>
                <span className="text-gray-400 text-sm">/mês</span>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {detail.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(key)}
                disabled={isCurrent || !!checkingOut}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : key === 'pro'
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : key === 'enterprise'
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                } disabled:opacity-50`}
              >
                {isCurrent ? 'Plano ativo' : checkingOut === key ? 'Redirecionando...' : `Assinar ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Pagamentos processados com segurança pelo Stripe. Cancele a qualquer momento.
      </p>
    </div>
  )
}
