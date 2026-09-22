import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: customer, error: customerError } = await supabase
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
    .eq('id', id)
    .single()

  if (customerError || !customer) {
    notFound()
  }

  const [
    serialNumbersResult,
    serviceRequestsResult,
  ] = await Promise.all([
    supabase
      .from('serial_numbers')
      .select(`
        id,
        serial_number,
        product_groups (
          id,
          name,
          code
        )
      `)
      .eq('customer_id', id)
      .order('serial_number'),

    supabase
      .from('service_requests')
      .select(`
        id,
        service_number,
        status,
        problem_description,
        created_at,
        product_groups (
          name
        ),
        serial_numbers (
          serial_number
        )
      `)
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (serialNumbersResult.error) {
    console.error(
      'Customer serial numbers error:',
      serialNumbersResult.error
    )
  }

  if (serviceRequestsResult.error) {
    console.error(
      'Customer service requests error:',
      serviceRequestsResult.error
    )
  }

  const serialNumbers = serialNumbersResult.data ?? []
  const serviceRequests = serviceRequestsResult.data ?? []

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/admin/customers"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zu Kunden
        </Link>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Kunde
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                {customer.name}
              </h1>
            </div>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium">
              {customer.is_active ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">
                E-Mail
              </p>
              <p className="mt-1 font-medium">
                {customer.email || '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Telefon
              </p>
              <p className="mt-1 font-medium">
                {customer.phone || '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                E-Mail
              </p>
              <p className="mt-1 font-medium">
                {customer.email || '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Ort
              </p>
              <p className="mt-1 font-medium">
                {[
                  customer.postal_code,
                  customer.city,
                  customer.country,
                ]
                  .filter(Boolean)
                  .join(' ') || '–'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Kundendaten bearbeiten
          </h2>

          <form
            action={`/api/admin/customers/${customer.id}`}
            method="post"
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Kundenname
              </label>

              <input
                id="name"
                name="name"
                required
                defaultValue={customer.name}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                defaultValue={customer.email ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Telefon
              </label>

              <input
                id="phone"
                name="phone"
                defaultValue={customer.phone ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="postal_code"
                className="mb-2 block text-sm font-medium"
              >
                PLZ
              </label>

              <input
                id="postal_code"
                name="postal_code"
                defaultValue={customer.postal_code ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-medium"
              >
                Ort
              </label>

              <input
                id="city"
                name="city"
                defaultValue={customer.city ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-medium"
              >
                Land
              </label>

              <input
                id="country"
                name="country"
                defaultValue={customer.country ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
              >
                Kundendaten speichern
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Kundendaten bearbeiten
          </h2>

          <form
            action={`/api/admin/customers/${customer.id}`}
            method="post"
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Kundenname
              </label>

              <input
                id="name"
                name="name"
                required
                defaultValue={customer.name}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
                defaultValue={customer.email ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Telefon
              </label>

              <input
                id="phone"
                name="phone"
                defaultValue={customer.phone ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="postal_code"
                className="mb-2 block text-sm font-medium"
              >
                PLZ
              </label>

              <input
                id="postal_code"
                name="postal_code"
                defaultValue={customer.postal_code ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-2 block text-sm font-medium"
              >
                Ort
              </label>

              <input
                id="city"
                name="city"
                defaultValue={customer.city ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-medium"
              >
                Land
              </label>

              <input
                id="country"
                name="country"
                defaultValue={customer.country ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
              >
                Kundendaten speichern
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Seriennummern
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {serialNumbers.length} zugeordnete Seriennummern
              </p>
            </div>
          </div>

          {serialNumbers.length === 0 ? (
            <p className="mt-6 text-gray-500">
              Keine Seriennummern vorhanden.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-3 py-3">
                      Seriennummer
                    </th>
                    <th className="px-3 py-3">
                      Produktgruppe
                    </th>
                    <th className="px-3 py-3">
                      Kürzel
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serialNumbers.map((item) => {
                    const productGroup =
                      Array.isArray(item.product_groups)
                        ? item.product_groups[0]
                        : item.product_groups

                    return (
                      <tr
                        key={item.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-4 font-semibold">
                          <Link
                            href={`/admin/serial/${item.id}`}
                            className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                          >
                            {item.serial_number}
                          </Link>
                        </td>

                        <td className="px-3 py-4">
                          {productGroup?.name ?? '–'}
                        </td>

                        <td className="px-3 py-4">
                          {productGroup?.code ?? '–'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Servicehistorie
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {serviceRequests.length} Servicefälle
          </p>

          {serviceRequests.length === 0 ? (
            <p className="mt-6 text-gray-500">
              Noch keine Servicefälle vorhanden.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-3 py-3">
                      Servicenummer
                    </th>
                    <th className="px-3 py-3">
                      Status
                    </th>
                    <th className="px-3 py-3">
                      Produktgruppe
                    </th>
                    <th className="px-3 py-3">
                      SN
                    </th>
                    <th className="px-3 py-3">
                      Problem
                    </th>
                    <th className="px-3 py-3">
                      Datum
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serviceRequests.map((request) => {
                    const productGroup =
                      Array.isArray(request.product_groups)
                        ? request.product_groups[0]
                        : request.product_groups

                    const serialNumber =
                      Array.isArray(request.serial_numbers)
                        ? request.serial_numbers[0]
                        : request.serial_numbers

                    return (
                      <tr
                        key={request.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-3 py-4 font-semibold">
                          <Link
                            href={`/admin/service/${request.id}`}
                            className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                          >
                            {request.service_number}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          <StatusBadge status={request.status} />
                        </td>

                        <td className="px-3 py-4">
                          {productGroup?.name ?? '–'}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          {serialNumber?.serial_number ?? '–'}
                        </td>

                        <td className="max-w-xs truncate px-3 py-4">
                          {request.problem_description}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          {new Intl.DateTimeFormat('de-AT', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: 'Europe/Vienna',
                          }).format(
                            new Date(request.created_at)
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
