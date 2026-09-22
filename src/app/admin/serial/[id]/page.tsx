import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
      installation_date,
      warranty_type,
      warranty_until,
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
            Installation & Garantie
          </h2>

          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">
                Installationsdatum
              </p>

              <p className="mt-1 font-semibold">
                {serialNumber.installation_date
                  ? new Intl.DateTimeFormat('de-AT', {
                      dateStyle: 'medium',
                      timeZone: 'Europe/Vienna',
                    }).format(
                      new Date(
                        `${serialNumber.installation_date}T12:00:00Z`
                      )
                    )
                  : '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Garantietyp
              </p>

              <p className="mt-1 font-semibold">
                {serialNumber.warranty_type === '3_years_on_site' &&
                  '3 Jahre Vor Ort'}

                {serialNumber.warranty_type === '3_years_bring_in' &&
                  '3 Jahre Bring-In'}

                {serialNumber.warranty_type === '5_years_on_site' &&
                  '5 Jahre Vor Ort'}

                {serialNumber.warranty_type === '5_years_bring_in' &&
                  '5 Jahre Bring-In'}

                {!serialNumber.warranty_type && '–'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Garantie bis
              </p>

              {serialNumber.warranty_until ? (
                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                    serialNumber.warranty_until >=
                    new Date().toISOString().slice(0, 10)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {new Intl.DateTimeFormat('de-AT', {
                    dateStyle: 'medium',
                    timeZone: 'Europe/Vienna',
                  }).format(
                    new Date(
                      `${serialNumber.warranty_until}T12:00:00Z`
                    )
                  )}
                </span>
              ) : (
                <p className="mt-1 font-semibold">
                  –
                </p>
              )}
            </div>
          </div>

          <div className="my-6 border-t" />

          <h3 className="font-semibold">
            Garantiedaten bearbeiten
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Nur für interne Mitarbeiter. Das Garantieende wird automatisch berechnet.
          </p>

          <form
            action={`/api/admin/serial/${serialNumber.id}/warranty`}
            method="post"
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="installation_date"
                className="mb-2 block text-sm font-medium"
              >
                Installationsdatum
              </label>

              <input
                id="installation_date"
                name="installation_date"
                type="date"
                defaultValue={
                  serialNumber.installation_date ?? ''
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="warranty_type"
                className="mb-2 block text-sm font-medium"
              >
                Garantietyp
              </label>

              <select
                id="warranty_type"
                name="warranty_type"
                defaultValue={
                  serialNumber.warranty_type ?? ''
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">
                  Keine Angabe
                </option>

                <option value="3_years_on_site">
                  3 Jahre Vor Ort
                </option>

                <option value="3_years_bring_in">
                  3 Jahre Bring-In
                </option>

                <option value="5_years_on_site">
                  5 Jahre Vor Ort
                </option>

                <option value="5_years_bring_in">
                  5 Jahre Bring-In
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
              >
                Garantiedaten speichern
              </button>
            </div>
          </form>
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
                        <StatusBadge status={service.status} />
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
