import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  let isAdmin = false

  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single()

    isAdmin =
      profile?.role === 'admin' &&
      profile?.is_active === true
  }

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <Link
              href="/admin"
              className="text-lg font-bold text-gray-900"
            >
              Service Management
            </Link>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/service"
              className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
            >
              Servicefälle
            </Link>

            <Link
              href="/admin/customers"
              className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
            >
              Kunden
            </Link>

            <Link
              href="/admin/serial"
              className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
            >
              Seriennummern
            </Link>

            <Link
              href="/admin/products"
              className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
            >
              Produktgruppen
            </Link>

            {isAdmin && (
              <Link
                href="/admin/users"
                className="rounded-lg px-3 py-2 font-medium hover:bg-gray-100"
              >
                Mitarbeiter
              </Link>
            )}

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="ml-2 rounded-lg border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
              >
                Abmelden
              </button>
            </form>
          </nav>
        </div>
      </header>

      {children}
    </>
  )
}
