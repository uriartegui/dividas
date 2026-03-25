'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: '📊 Dashboard' },
  { href: '/dashboard/debtors', label: '👤 Devedores' },
  { href: '/dashboard/debts', label: '💰 Dívidas' },
  { href: '/dashboard/collections', label: '📞 Cobranças' },
  { href: '/dashboard/agreements', label: '🤝 Acordos' },
  { href: '/dashboard/ai-chat', label: '🤖 Chat IA' },
  { href: '/dashboard/whatsapp', label: '💬 WhatsApp' },
  { href: '/dashboard/profile', label: '🏥 Perfil' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, init, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { init() }, [])
  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Carregando...</p>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg">Cobranças</h1>
          {user.tenantName && <p className="text-gray-500 text-xs mt-0.5">{user.tenantName}</p>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          {user.name && <p className="text-gray-500 text-xs px-3 mb-2">{user.name}</p>}
          <button
            onClick={logout}
            className="w-full text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  )
}
