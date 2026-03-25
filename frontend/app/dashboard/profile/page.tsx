'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Profile {
  id: string; name: string; slug: string; email: string
  phone: string; cnpj: string; plan: string; created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', cnpj: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile(data)
      setForm({ name: data.name || '', email: data.email || '', phone: data.phone || '', cnpj: data.cnpj || '' })
    }).catch(() => toast.error('Erro ao carregar perfil')).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/profile', form)
      setProfile(data)
      toast.success('Perfil atualizado com sucesso!')
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const planLabel: Record<string, string> = {
    trial: '🆓 Trial', basic: '⭐ Basic', pro: '🚀 Pro', enterprise: '💎 Enterprise'
  }

  if (loading) return <p className="text-gray-400">Carregando...</p>
  if (!profile) return null

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Perfil da Clínica</h2>

      {/* Info readonly */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Slug (identificador de login)</p>
          <p className="text-white font-mono font-semibold">{profile.slug}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Plano atual</p>
          <p className="text-white font-semibold">{planLabel[profile.plan] || profile.plan}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Cliente desde</p>
          <p className="text-white text-sm">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Formulário editável */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Informações da Clínica</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nome da clínica *', key: 'name', type: 'text', required: true },
            { label: 'Email', key: 'email', type: 'email', required: false },
            { label: 'Telefone', key: 'phone', type: 'text', required: false },
            { label: 'CNPJ', key: 'cnpj', type: 'text', required: false },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                required={required}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
