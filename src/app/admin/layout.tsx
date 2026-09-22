import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
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
