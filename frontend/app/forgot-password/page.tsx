'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: '', tenantSlug: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', form)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-white text-xl font-bold mb-2">Email enviado!</h2>
        <p className="text-gray-400 mb-6">Se o email existir, você receberá um link para redefinir sua senha.</p>
        <button onClick={() => router.push('/login')} className="text-blue-400 hover:underline text-sm">
          Voltar ao login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-2">Esqueci minha senha</h1>
        <p className="text-gray-400 text-sm mb-6">Digite seu email e slug da empresa para receber o link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Slug da empresa</label>
            <input
              type="text"
              value={form.tenantSlug}
              onChange={e => setForm({ ...form, tenantSlug: e.target.value })}
              className="w-full mt-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="clinica-teste"
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="admin@clinica.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
        <p className="text-center text-gray-500 text-sm mt-4">
          <button onClick={() => router.push('/login')} className="text-blue-400 hover:underline">
            Voltar ao login
          </button>
        </p>
      </div>
    </div>
  )
}
