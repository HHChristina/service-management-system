'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    const supabase = createClient()

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      setError('E-Mail-Adresse oder Passwort ist nicht korrekt.')
      setLoading(false)
      return
    }

    window.location.href = '/admin'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Service Management
        </h1>

        <p className="mt-2 text-gray-600">
          Interner Login
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          <div>
            <label className="mb-2 block font-medium">
              E-Mail-Adresse
            </label>

            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Passwort
            </label>

            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </main>
  )
}
