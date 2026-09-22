import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect('/login')
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  if (
    !currentProfile ||
    !currentProfile.is_active ||
    currentProfile.role !== 'admin'
  ) {
    redirect('/admin')
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      display_name,
      role,
      is_active
    `)
    .order('email')

  if (error) {
    throw new Error(
      `Mitarbeiter konnten nicht geladen werden: ${error.message}`
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/admin"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3">
          <h1 className="text-3xl font-bold">
            Mitarbeiter
          </h1>

          <p className="mt-1 text-gray-500">
            Interne Benutzer und Zugriffsrechte verwalten
          </p>
        </div>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Neuen Mitarbeiter anlegen
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Das Startpasswort wird nicht gespeichert oder später angezeigt.
          </p>

          <form
            action="/api/admin/users/create"
            method="post"
            className="mt-6 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="display_name"
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>

              <input
                id="display_name"
                name="display_name"
                required
                maxLength={150}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="Max Mustermann"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                E-Mail
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="max@firma.at"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Startpasswort
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={12}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />

              <p className="mt-1 text-xs text-gray-500">
                Mindestens 12 Zeichen
              </p>
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium"
              >
                Rolle
              </label>

              <select
                id="role"
                name="role"
                defaultValue="staff"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="staff">
                  Mitarbeiter
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
              >
                Mitarbeiter anlegen
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold">
              Vorhandene Mitarbeiter
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y bg-gray-50 text-gray-500">
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">E-Mail</th>
                  <th className="px-5 py-4">Rolle</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Aktion</th>
                </tr>
              </thead>

              <tbody>
                {(users ?? []).map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">
                      {user.display_name || '–'}
                    </td>

                    <td className="px-5 py-4">
                      {user.email}
                    </td>

                    <td className="px-5 py-4">
                      {user.role === 'admin'
                        ? 'Admin'
                        : user.role === 'staff'
                          ? 'Mitarbeiter'
                          : 'Ausstehend'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.id === userId ? (
                        <span className="text-sm text-gray-400">
                          Eigener Benutzer
                        </span>
                      ) : (
                        <form
                          action={`/api/admin/users/${user.id}/toggle`}
                          method="post"
                        >
                          <input
                            type="hidden"
                            name="is_active"
                            value={
                              user.is_active
                                ? 'false'
                                : 'true'
                            }
                          />

                          <button
                            type="submit"
                            className="rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50"
                          >
                            {user.is_active
                              ? 'Deaktivieren'
                              : 'Aktivieren'}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  )
}
