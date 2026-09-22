import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
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

  const [
    customersResult,
    serialNumbersResult,
    serviceRequestsResult,
  ] = await Promise.all([
    supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        postal_code,
        city,
        country,
        is_active
      `)
      .order('name'),

    supabase
      .from('serial_numbers')
      .select('customer_id'),

    supabase
      .from('service_requests')
      .select('customer_id'),
  ])

  if (customersResult.error) {
    console.error('Customers query error:', customersResult.error)
    throw new Error(
      `Kunden konnten nicht geladen werden: ${customersResult.error.message}`
    )
  }

  if (serialNumbersResult.error) {
    console.error('Serial numbers query error:', serialNumbersResult.error)
  }

  if (serviceRequestsResult.error) {
    console.error('Service requests query error:', serviceRequestsResult.error)
  }

  const customers = customersResult.data ?? []
  const serialNumbers = serialNumbersResult.data ?? []
  const serviceRequests = serviceRequestsResult.data ?? []

  const serialCounts = new Map<string, number>()
  const serviceCounts = new Map<string, number>()

  serialNumbers.forEach((item) => {
    serialCounts.set(
      item.customer_id,
      (serialCounts.get(item.customer_id) ?? 0) + 1
    )
  })

  serviceRequests.forEach((item) => {
    serviceCounts.set(
      item.customer_id,
      (serviceCounts.get(item.customer_id) ?? 0) + 1
    )
  })

  const search = q.toLowerCase()

  const filteredCustomers = q
    ? customers.filter((customer) =>
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.postal_code,
          customer.city,
          customer.country,
        ].some((value) =>
          value?.toLowerCase().includes(search)
        )
      )
    : customers

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
          <h1 className="text-3xl font-bold text-gray-900">
            Kunden
          </h1>

          <p className="mt-1 text-gray-500">
            {filteredCustomers.length} Kunden gefunden
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
            Kundensuche
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Kunde, E-Mail, Telefon, PLZ, Ort..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />

            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Suchen
            </button>

            <Link
              href="/admin/customers"
              className="rounded-lg border border-gray-300 px-5 py-3 text-center font-medium hover:bg-gray-50"
            >
              Zurücksetzen
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          {filteredCustomers.length === 0 ? (
            <p className="p-10 text-center text-gray-500">
              Keine Kunden gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500">
                    <th className="px-5 py-4">Kunde</th>
                    <th className="px-5 py-4">E-Mail</th>
                    <th className="px-5 py-4">Telefon</th>
                    <th className="px-5 py-4">Ort</th>
                    <th className="px-5 py-4">Seriennummern</th>
                    <th className="px-5 py-4">Servicefälle</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                        >
                          {customer.name}
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        {customer.email || '–'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {customer.phone || '–'}
                      </td>

                      <td className="px-5 py-4">
                        {[customer.postal_code, customer.city]
                          .filter(Boolean)
                          .join(' ') || '–'}
                      </td>

                      <td className="px-5 py-4">
                        {serialCounts.get(customer.id) ?? 0}
                      </td>

                      <td className="px-5 py-4">
                        {serviceCounts.get(customer.id) ?? 0}
                      </td>

                      <td className="px-5 py-4">
                        {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
