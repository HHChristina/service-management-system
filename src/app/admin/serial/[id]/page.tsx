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

export default async function SerialNumberPage({
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

  const { data: serialNumber, error: serialError } = await supabase
    .from('serial_numbers')
    .select(`
      id,
      serial_number,
      customer_id,
      product_group_id,
      customers (
        id,
        name,
        email,
        phone,
        postal_code,
        city,
        country
      ),
      product_groups (
        id,
        name,
        code
      )
    `)
    .eq('id', id)
    .single()

  if (serialError || !serialNumber) {
    notFound()
  }

  const { data: serviceRequests, error: serviceError } =
    await supabase
      .from('service_requests')
      .select(`
        id,
        service_number,
        status,
        problem_description,
        created_at
      `)
      .eq('serial_number_id', id)
      .order('created_at', { ascending: false })

  if (serviceError) {
    console.error('SN service history error:', serviceError)
  }

  const customer = Array.isArray(serialNumber.customers)
    ? serialNumber.customers[0]
    : serialNumber.customers

  const productGroup = Array.isArray(serialNumber.product_groups)
    ? serialNumber.product_groups[0]
    : serialNumber.product_groups

  const services = serviceRequests ?? []

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        <Link
          href={
            customer?.id
              ? `/admin/customers/${customer.id}`
              : '/admin/customers'
          }
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zum Kunden
        </Link>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Seriennummer
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {serialNumber.serial_number}
          </h1>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">
                Kunde
              </p>

              {customer?.id ? (
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="mt-1 block font-semibold underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                >
                  {customer.name}
                </Link>
              ) : (
                <p className="mt-1 font-semibold">
                  –
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Produktgruppe
              </p>

              <p className="mt-1 font-semibold">
                {productGroup?.name ?? '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Kürzel
              </p>

              <p className="mt-1 font-semibold">
                {productGroup?.code ?? '–'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Kundendaten
          </h2>

          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">
                E-Mail
              </p>
              <p className="mt-1">
                {customer?.email || '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Telefon
              </p>
              <p className="mt-1">
                {customer?.phone || '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Ort
              </p>
              <p className="mt-1">
                {[
                  customer?.postal_code,
                  customer?.city,
                  customer?.country,
                ]
                  .filter(Boolean)
                  .join(' ') || '–'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">
              Servicehistorie dieser Seriennummer
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {services.length} Servicefälle
            </p>
          </div>

          {services.length === 0 ? (
            <p className="mt-6 text-gray-500">
              Für diese Seriennummer gibt es noch keine Servicefälle.
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
                      Problem
                    </th>
                    <th className="px-3 py-3">
                      Datum
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {services.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-3 py-4 font-semibold">
                        <Link
                          href={`/admin/service/${service.id}`}
                          className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                        >
                          {service.service_number}
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4">
                        {statusLabel(service.status)}
                      </td>

                      <td className="max-w-lg px-3 py-4">
                        {service.problem_description}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4">
                        {new Intl.DateTimeFormat('de-AT', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                          timeZone: 'Europe/Vienna',
                        }).format(
                          new Date(service.created_at)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
