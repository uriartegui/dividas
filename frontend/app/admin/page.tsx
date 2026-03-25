'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Metrics {
  totalTenants: number
  totalDebtors: number
  totalDebts: number
  totalCalls: number
  planBreakdown: Record<string, number>
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/metrics').then(({ data }) => setMetrics(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400">Carregando...</p>
  if (!metrics) return null

  const planLabel: Record<string, string> = {
    trial: '🆓 Trial', basic: '⭐ Basic', pro: '🚀 Pro', enterprise: '💎 Enterprise'
  }

  const planColor: Record<string, string> = {
    trial: 'text-gray-400', basic: 'text-blue-400', pro: 'text-purple-400', enterprise: 'text-yellow-400'
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Visão Geral</h2>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Clínicas Ativas', value: metrics.totalTenants, color: 'text-blue-400', icon: '🏥' },
          { label: 'Total Devedores', value: metrics.totalDebtors, color: 'text-red-400', icon: '👤' },
          { label: 'Total Dívidas', value: metrics.totalDebts, color: 'text-yellow-400', icon: '💰' },
          { label: 'Total Chamadas', value: metrics.totalCalls, color: 'text-green-400', icon: '📞' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-2xl mb-1">{icon}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Breakdown de planos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Distribuição de Planos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.planBreakdown).map(([plan, count]) => (
            <div key={plan} className="bg-gray-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${planColor[plan] || 'text-white'}`}>{count}</p>
              <p className="text-gray-400 text-sm mt-1">{planLabel[plan] || plan}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
