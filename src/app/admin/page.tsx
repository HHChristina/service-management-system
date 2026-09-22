import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  const claims = claimsData?.claims

  if (claimsError || !claims?.sub) {
    redirect('/login')
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('email, display_name, role, is_active')
      .eq('id', claims.sub)
      .single()

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !['admin', 'staff'].includes(profile.role)
  ) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Service Management
            </h1>

            <p className="mt-2 text-gray-600">
              Angemeldet als{' '}
              {profile.display_name || profile.email}
            </p>

            <p className="text-sm text-gray-500">
              Rolle: {profile.role}
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium"
            >
              Abmelden
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Servicefälle
            </p>
            <p className="mt-2 text-2xl font-bold">–</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Kunden
            </p>
            <p className="mt-2 text-2xl font-bold">–</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Seriennummern
            </p>
            <p className="mt-2 text-2xl font-bold">–</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Produktgruppen
            </p>
            <p className="mt-2 text-2xl font-bold">4</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold">
            Admin-Bereich funktioniert ✅
          </h2>

          <p className="mt-2 text-gray-600">
            Als Nächstes bauen wir hier das echte
            Service-Dashboard ein.
          </p>
        </div>
      </div>
    </main>
  )
}
