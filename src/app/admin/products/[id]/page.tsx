import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function statusLabel(status: string) {
  if (status === 'new') return 'Neu'
  if (status === 'in_progress') return 'In Bearbeitung'
  if (status === 'completed') return 'Abgeschlossen'
  return status
}

export default async function ProductGroupPage({
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

  const { data: productGroup, error: productError } =
    await supabase
      .from('product_groups')
      .select('id, name, code, is_active')
      .eq('id', id)
      .single()

  if (productError || !productGroup) {
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
        customers (
          id,
          name
        )
      `)
      .eq('product_group_id', id)
      .order('serial_number'),

    supabase
      .from('service_requests')
      .select(`
        id,
        service_number,
        status,
        problem_description,
        created_at,
        customers (
          id,
          name
        ),
        serial_numbers (
          id,
          serial_number
        )
      `)
      .eq('product_group_id', id)
      .order('created_at', { ascending: false }),
  ])

  const serialNumbers = serialNumbersResult.data ?? []
  const serviceRequests = serviceRequestsResult.data ?? []

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/admin/products"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zu Produktgruppen
        </Link>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            {productGroup.code}
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {productGroup.name}
          </h1>

          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-sm text-gray-500">
                Seriennummern
              </p>
              <p className="text-2xl font-bold">
                {serialNumbers.length}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Servicefälle
              </p>
              <p className="text-2xl font-bold">
                {serviceRequests.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Seriennummern
          </h2>

          {serialNumbers.length === 0 ? (
            <p className="mt-5 text-gray-500">
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
                      Kunde
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serialNumbers.map((item) => {
                    const customer = Array.isArray(item.customers)
                      ? item.customers[0]
                      : item.customers

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
            Servicefälle
          </h2>

          {serviceRequests.length === 0 ? (
            <p className="mt-5 text-gray-500">
              Keine Servicefälle vorhanden.
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
                      Kunde
                    </th>
                    <th className="px-3 py-3">
                      Seriennummer
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
                    const customer = Array.isArray(request.customers)
                      ? request.customers[0]
                      : request.customers

                    const serialNumber = Array.isArray(request.serial_numbers)
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
                          {statusLabel(request.status)}
                        </td>

                        <td className="px-3 py-4">
                          {customer?.name ?? '–'}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          {serialNumber?.id ? (
                            <Link
                              href={`/admin/serial/${serialNumber.id}`}
                              className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                            >
                              {serialNumber.serial_number}
                            </Link>
                          ) : (
                            '–'
                          )}
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
