'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface Debtor {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  active: boolean
}

const empty = { name: '', cpf: '', email: '', phone: '', notes: '' }

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get('/debtors')
      setDebtors(data)
    } catch {
      setError('Erro ao carregar devedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/debtors', form)
      setForm(empty)
      setShowModal(false)
      load()
    } catch {
      setError('Erro ao salvar devedor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover devedor?')) return
    await api.delete(`/debtors/${id}`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Devedores</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Novo Devedor
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : debtors.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Nenhum devedor cadastrado.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">CPF</th>
                <th className="text-left px-5 py-3">Telefone</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((d) => (
                <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{d.name}</td>
                  <td className="px-5 py-3 text-gray-400">{d.cpf || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{d.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{d.email || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Novo Devedor</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Nome *', key: 'name', type: 'text', required: true },
                { label: 'CPF', key: 'cpf', type: 'text', required: false },
                { label: 'Email', key: 'email', type: 'email', required: false },
                { label: 'Telefone', key: 'phone', type: 'text', required: false },
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
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(empty) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
