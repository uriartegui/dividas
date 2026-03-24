'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const params = useSearchParams()
  const slug = params.get('slug')

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center shadow-xl">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">Clínica cadastrada!</h1>
        <p className="text-gray-400 text-sm mb-6">
          Sua conta foi criada com sucesso. Agora é só entrar no painel.
        </p>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-gray-500 mb-2">Seus dados de acesso:</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Slug:</span>{' '}
              <span className="text-white font-medium">{slug}</span>
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Email:</span>{' '}
              <span className="text-white font-medium">o que você cadastrou</span>
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-4 py-3 transition-colors text-sm"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
