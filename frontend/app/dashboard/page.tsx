'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Metrics {
  totalOpen: number
  totalRecovered: number
  recoveryRate: number
  totalDebts: number
  recoveredCount: number
  totalCalls: number
  successfulCalls: number
  messagesSent: number
  outcomeBreakdown: Record<string, number>
}

interface MonthlyData {
  label: string
  aberto: number
  recuperado: number
}

const outcomeLabel: Record<string, string> = {
  accepted: 'Aceitou',
  refused: 'Recusou',
  wants_installment: 'Quer Parcelar',
  no_answer: 'Não Atendeu',
  already_paid: 'Já Pagou',
}

const outcomeColor: Record<string, string> = {
  accepted: 'bg-green-500',
  refused: 'bg-red-500',
  wants_installment: 'bg-purple-500',
  no_answer: 'bg-gray-500',
  already_paid: 'bg-blue-500',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtK(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/metrics'),
      api.get('/dashboard/monthly'),
    ]).then(([metricsRes, monthlyRes]) => {
      setMetrics(metricsRes.data)
      setMonthly(monthlyRes.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400">Carregando métricas...</p>
  if (!metrics) return <p className="text-red-400">Erro ao carregar métricas.</p>

  const totalOutcomes = Object.values(metrics.outcomeBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Total em Aberto</p>
          <p className="text-2xl font-bold text-red-400">{fmt(metrics.totalOpen)}</p>
          <p className="text-gray-500 text-xs mt-1">{metrics.totalDebts - metrics.recoveredCount} dívida(s)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Total Recuperado</p>
          <p className="text-2xl font-bold text-green-400">{fmt(metrics.totalRecovered)}</p>
          <p className="text-gray-500 text-xs mt-1">{metrics.recoveredCount} dívida(s)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Taxa de Recuperação</p>
          <p className="text-2xl font-bold text-blue-400">{metrics.recoveryRate}%</p>
          <p className="text-gray-500 text-xs mt-1">de {metrics.totalDebts} dívida(s)</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-1">Mensagens Enviadas</p>
          <p className="text-2xl font-bold text-purple-400">{metrics.messagesSent}</p>
          <p className="text-gray-500 text-xs mt-1">via WhatsApp</p>
        </div>
      </div>

      {/* Gráfico de evolução mensal */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="text-white font-semibold text-sm mb-4">📈 Evolução Mensal (últimos 6 meses)</h3>
        {monthly.every(m => m.aberto === 0 && m.recuperado === 0) ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500 text-sm">Nenhuma dívida registrada ainda.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tickFormatter={fmtK} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v) => fmt(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Bar dataKey="aberto" name="Em Aberto" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recuperado" name="Recuperado" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Chamadas Realizadas</h3>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold text-white">{metrics.totalCalls}</p>
              <p className="text-gray-400 text-xs mt-1">total de contatos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400">{metrics.successfulCalls}</p>
              <p className="text-gray-400 text-xs mt-1">com resultado positivo</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-400">
                {metrics.totalCalls > 0 ? ((metrics.successfulCalls / metrics.totalCalls) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-gray-400 text-xs mt-1">taxa de sucesso</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Resultado das Chamadas</h3>
          {totalOutcomes === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma chamada ainda.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.outcomeBreakdown).map(([outcome, count]) => {
                const pct = Math.round((count / totalOutcomes) * 100)
                return (
                  <div key={outcome}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{outcomeLabel[outcome] || outcome}</span>
                      <span className="text-white">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${outcomeColor[outcome] || 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra de progresso recuperação */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-white font-semibold">Progresso de Recuperação</span>
          <span className="text-gray-400">{fmt(metrics.totalRecovered)} de {fmt(metrics.totalOpen + metrics.totalRecovered)}</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${metrics.recoveryRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-green-400">{metrics.recoveryRate}% recuperado</span>
          <span className="text-gray-500">{(100 - metrics.recoveryRate).toFixed(1)}% pendente</span>
        </div>
      </div>
    </div>
  )
}
