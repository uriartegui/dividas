'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

const empty = {
  tenantName: '',
  tenantSlug: '',
  tenantEmail: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  setForm({ ...form, tenantSlug: slug, tenantName: value })
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        tenantName: form.tenantName,
        tenantSlug: form.tenantSlug,
        tenantEmail: form.tenantEmail,
        name: form.name,
        email: form.email,
        password: form.password,
      })
      router.push('/register/success?slug=' + form.tenantSlug)
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg?.includes('já existe')) setError('Esse nome de clínica já está em uso.')
      else setError('Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Cobranças</h1>
          <p className="text-gray-400 mt-1 text-sm">Cadastre sua clínica e comece grátis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Dados da clínica */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Dados da Clínica</p>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome da clínica *</label>
              <input
                type="text"
                placeholder="Clínica São Lucas"
                value={form.tenantName}
                onChange={e => handleSlug(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Identificador (slug) *</label>
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                <span className="px-3 text-gray-500 text-xs border-r border-gray-700 py-2.5">app.com/</span>
                <input
                  type="text"
                  value={form.tenantSlug}
                  onChange={e => setForm({ ...form, tenantSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm focus:outline-none"
                  placeholder="clinica-sao-lucas"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Usado para login. Só letras, números e hífens.</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email da clínica *</label>
              <input
                type="email"
                placeholder="contato@clinica.com"
                value={form.tenantEmail}
                onChange={e => setForm({ ...form, tenantEmail: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Dados do admin */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Seu acesso</p>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Seu nome *</label>
              <input
                type="text"
                placeholder="João Silva"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Seu email *</label>
              <input
                type="email"
                placeholder="joao@clinica.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha *</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirmar senha *</label>
              <input
                type="password"
                placeholder="Repita a senha"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors text-sm"
          >
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Já tem conta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
