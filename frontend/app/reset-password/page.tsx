'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Link inválido ou expirado.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: form.password })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Link inválido ou expirado. Solicite um novo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Nova senha</h1>
          <p className="text-gray-400 mt-1 text-sm">Digite sua nova senha abaixo</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <p className="text-green-400 font-medium">Senha alterada com sucesso!</p>
            <p className="text-gray-400 text-sm">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nova senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirmar senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <p className="text-center text-gray-500 text-sm mt-2">
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Voltar ao login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
