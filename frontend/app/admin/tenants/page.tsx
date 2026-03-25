'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Tenant {
  id: string; name: string; slug: string; email: string
  plan: string; active: boolean; created_at: string
  debtors: number; debts: number; calls: number
}

const planLabel: Record<string, string> = {
  trial: 'Trial', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise'
}
const planColor: Record<string, string> = {
  trial: 'text-gray-400', basic: 'text-blue-400', pro: 'text-purple-400', enterprise: 'text-yellow-400'
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get('/admin/tenants').then(({ data }) => setTenants(data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.patch(`/admin/tenants/${id}/toggle`)
      toast.success(active ? 'Clínica desativada' : 'Clínica ativada')
      load()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  if (loading) return <p className="text-gray-400">Carregando...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Clínicas <span className="text-gray-500 text-base font-normal">({tenants.length})</span>
      </h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-5 py-3">Clínica</th>
              <th className="text-left px-5 py-3">Slug</th>
              <th className="text-left px-5 py-3">Plano</th>
              <th className="text-left px-5 py-3">Devedores</th>
              <th className="text-left px-5 py-3">Dívidas</th>
              <th className="text-left px-5 py-3">Chamadas</th>
              <th className="text-left px-5 py-3">Cadastro</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.email}</p>
                </td>
                <td className="px-5 py-3 text-gray-400 font-mono text-xs">{t.slug}</td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${planColor[t.plan]}`}>{planLabel[t.plan] || t.plan}</span>
                </td>
                <td className="px-5 py-3 text-gray-300">{t.debtors}</td>
                <td className="px-5 py-3 text-gray-300">{t.debts}</td>
                <td className="px-5 py-3 text-gray-300">{t.calls}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {t.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleToggle(t.id, t.active)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${t.active ? 'bg-red-900/40 text-red-400 hover:bg-red-900/70' : 'bg-green-900/40 text-green-400 hover:bg-green-900/70'}`}
                  >
                    {t.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tenants.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">Nenhuma clínica cadastrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
