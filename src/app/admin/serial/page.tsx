import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SerialNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single()

  if (
    !profile ||
    !profile.is_active ||
    !['admin', 'staff'].includes(profile.role)
  ) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('serial_numbers')
    .select(`
      id,
      serial_number,
      customers (
        id,
        name,
        email,
        city
      ),
      product_groups (
        id,
        name,
        code
      )
    `)
    .order('serial_number')

  if (error) {
    console.error('Serial numbers query error:', error)
    throw new Error(`Seriennummern konnten nicht geladen werden: ${error.message}`)
  }

  const serialNumbers = data ?? []
  const search = q.toLowerCase()

  const filteredSerialNumbers = q
    ? serialNumbers.filter((item) => {
        const customer = Array.isArray(item.customers)
          ? item.customers[0]
          : item.customers

        const productGroup = Array.isArray(item.product_groups)
          ? item.product_groups[0]
          : item.product_groups

        return [
          item.serial_number,
          customer?.name,
          customer?.email,
          customer?.city,
          productGroup?.name,
          productGroup?.code,
        ].some((value) =>
          value?.toLowerCase().includes(search)
        )
      })
    : serialNumbers

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/admin"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3">
          <h1 className="text-3xl font-bold">
            Seriennummern
          </h1>

          <p className="mt-1 text-gray-500">
            {filteredSerialNumbers.length} Seriennummern gefunden
          </p>
        </div>

        <form
          method="get"
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <label
            htmlFor="q"
            className="mb-2 block text-sm font-medium"
          >
            Suche
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="SN, Kunde, E-Mail, Ort oder Produktgruppe..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />

            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Suchen
            </button>

            <Link
              href="/admin/serial"
              className="rounded-lg border border-gray-300 px-5 py-3 text-center font-medium hover:bg-gray-50"
            >
              Zurücksetzen
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          {filteredSerialNumbers.length === 0 ? (
            <p className="p-10 text-center text-gray-500">
              Keine Seriennummern gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500">
                    <th className="px-5 py-4">
                      Seriennummer
                    </th>

                    <th className="px-5 py-4">
                      Kunde
                    </th>

                    <th className="px-5 py-4">
                      Produktgruppe
                    </th>

                    <th className="px-5 py-4">
                      Kürzel
                    </th>

                    <th className="px-5 py-4">
                      E-Mail
                    </th>

                    <th className="px-5 py-4">
                      Ort
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSerialNumbers.map((item) => {
                    const customer = Array.isArray(item.customers)
                      ? item.customers[0]
                      : item.customers

                    const productGroup = Array.isArray(item.product_groups)
                      ? item.product_groups[0]
                      : item.product_groups

                    return (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold">
                          <Link
                            href={`/admin/serial/${item.id}`}
                            className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                          >
                            {item.serial_number}
                          </Link>
                        </td>

                        <td className="px-5 py-4">
                          {customer?.id ? (
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                            >
                              {customer.name}
                            </Link>
                          ) : (
                            '–'
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {productGroup?.name ?? '–'}
                        </td>

                        <td className="px-5 py-4">
                          {productGroup?.code ?? '–'}
                        </td>

                        <td className="px-5 py-4">
                          {customer?.email ?? '–'}
                        </td>

                        <td className="px-5 py-4">
                          {customer?.city ?? '–'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
