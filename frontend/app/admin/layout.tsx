'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Toaster } from 'react-hot-toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, init, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => { init() }, [])
  useEffect(() => {
    if (isLoginPage) return
    if (!loading && !user) router.push('/admin/login')
    if (!loading && user && user.role !== 'superadmin') router.push('/login')
  }, [loading, user, isLoginPage])

  // Página de login — renderiza sem sidebar
  if (isLoginPage) return (
    <>
      {children}
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' }
      }} />
    </>
  )

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  if (!user || user.role !== 'superadmin') return null

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <p className="text-xl mb-1">🛡️</p>
          <h1 className="text-white font-bold">Super Admin</h1>
          <p className="text-gray-500 text-xs mt-0.5">Painel de controle</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            📊 Visão Geral
          </a>
          <a href="/admin/tenants" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            🏥 Clínicas
          </a>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={logout}
            className="w-full text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' }
      }} />
    </div>
  )
}
