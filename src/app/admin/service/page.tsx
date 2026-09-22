import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function statusLabel(status: string) {
  if (status === 'new') return 'Neu'
  if (status === 'in_progress') return 'In Bearbeitung'
  if (status === 'completed') return 'Abgeschlossen'
  return status
}

export default async function ServiceListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    product?: string
  }>
}) {
  const params = await searchParams

  const q = params.q?.trim() ?? ''
  const status = params.status ?? ''
  const product = params.product ?? ''

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

  let query = supabase
    .from('service_requests')
    .select(`
      id,
      service_number,
      status,
      problem_description,
      contact_customer_name,
      contact_first_name,
      contact_last_name,
      contact_email,
      created_at,
      customers (
        name
      ),
      product_groups (
        id,
        name
      ),
      serial_numbers (
        serial_number
      )
    `)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(
      `service_number.ilike.%${q}%,problem_description.ilike.%${q}%,contact_customer_name.ilike.%${q}%,contact_first_name.ilike.%${q}%,contact_last_name.ilike.%${q}%,contact_email.ilike.%${q}%`
    )
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (product) {
    query = query.eq('product_group_id', product)
  }

  const [
    serviceResult,
    productGroupsResult,
  ] = await Promise.all([
    query,
    supabase
      .from('product_groups')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  const serviceRequests = serviceResult.data ?? []
  const productGroups = productGroupsResult.data ?? []

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-gray-600 hover:text-black"
            >
              ← Zurück zum Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Servicefälle
            </h1>

            <p className="mt-1 text-gray-500">
              {serviceRequests.length} Servicefälle gefunden
            </p>
          </div>
        </div>

        <form
          method="get"
          className="mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4"
        >
          <div className="md:col-span-2">
            <label
              htmlFor="q"
              className="mb-2 block text-sm font-medium"
            >
              Suche
            </label>

            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Servicenummer, Kunde, E-Mail, Problem..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-medium"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={status}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">Alle Status</option>
              <option value="new">Neu</option>
              <option value="in_progress">
                In Bearbeitung
              </option>
              <option value="completed">
                Abgeschlossen
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="product"
              className="mb-2 block text-sm font-medium"
            >
              Produktgruppe
            </label>

            <select
              id="product"
              name="product"
              defaultValue={product}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">
                Alle Produktgruppen
              </option>

              {productGroups.map((group) => (
                <option
                  key={group.id}
                  value={group.id}
                >
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Filtern
            </button>

            <Link
              href="/admin/service"
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50"
            >
              Zurücksetzen
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          {serviceRequests.length === 0 ? (
            <p className="p-10 text-center text-gray-500">
              Keine passenden Servicefälle gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500">
                    <th className="px-5 py-4">
                      Servicenummer
                    </th>
                    <th className="px-5 py-4">
                      Status
                    </th>
                    <th className="px-5 py-4">
                      Kunde
                    </th>
                    <th className="px-5 py-4">
                      Produktgruppe
                    </th>
                    <th className="px-5 py-4">
                      Seriennummer
                    </th>
                    <th className="px-5 py-4">
                      Problem
                    </th>
                    <th className="px-5 py-4">
                      Eingang
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {serviceRequests.map((request) => {
                    const customer = Array.isArray(request.customers)
                      ? request.customers[0]
                      : request.customers

                    const productGroup = Array.isArray(request.product_groups)
                      ? request.product_groups[0]
                      : request.product_groups

                    const serialNumber = Array.isArray(request.serial_numbers)
                      ? request.serial_numbers[0]
                      : request.serial_numbers

                    return (
                      <tr
                        key={request.id}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold">
                          <Link
                            href={`/admin/service/${request.id}`}
                            className="underline decoration-gray-300 underline-offset-4 hover:decoration-black"
                          >
                            {request.service_number}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {statusLabel(request.status)}
                        </td>

                        <td className="px-5 py-4">
                          {customer?.name ??
                            request.contact_customer_name ??
                            '–'}
                        </td>

                        <td className="px-5 py-4">
                          {productGroup?.name ?? '–'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {serialNumber?.serial_number ?? '–'}
                        </td>

                        <td className="max-w-sm truncate px-5 py-4">
                          {request.problem_description}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
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
        </div>
      </div>
    </main>
  )
}
