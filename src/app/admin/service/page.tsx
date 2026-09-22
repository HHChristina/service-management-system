import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/admin/status-badge'

export const dynamic = 'force-dynamic'

function toArray(
  value: string | string[] | undefined
): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default async function ServiceListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string | string[]
    product?: string | string[]
  }>
}) {
  const params = await searchParams

  const q = params.q?.trim() ?? ''
  const selectedStatuses = toArray(params.status)
  const selectedProducts = toArray(params.product)

  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

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

  const { data: productGroupsData } = await supabase
    .from('product_groups')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')

  const productGroups = productGroupsData ?? []

  /*
   * Sonderzeichen entfernen, die die PostgREST-
   * Filtersyntax beeinflussen könnten.
   */
  const searchTerm = q
    .replace(/[,%()]/g, ' ')
    .trim()

  let matchingSerialNumberIds: string[] = []

  if (searchTerm) {
    const { data: serialMatches } = await supabase
      .from('serial_numbers')
      .select('id')
      .ilike(
        'serial_number',
        `%${searchTerm}%`
      )
      .limit(200)

    matchingSerialNumberIds =
      serialMatches?.map((serial) => serial.id) ?? []
  }

  let query = supabase
    .from('service_requests')
    .select(`
      id,
      service_number,
      status,
      problem_description,
      final_fault,
      contact_customer_name,
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      created_at,
      customers (
        name
      ),
      product_groups (
        id,
        name,
        code
      ),
      serial_numbers (
        serial_number
      )
    `)
    .order('created_at', {
      ascending: false,
    })

  if (searchTerm) {
    const searchFilters = [
      `service_number.ilike.%${searchTerm}%`,
      `problem_description.ilike.%${searchTerm}%`,
      `final_fault.ilike.%${searchTerm}%`,
      `contact_customer_name.ilike.%${searchTerm}%`,
      `contact_first_name.ilike.%${searchTerm}%`,
      `contact_last_name.ilike.%${searchTerm}%`,
      `contact_email.ilike.%${searchTerm}%`,
      `contact_phone.ilike.%${searchTerm}%`,
    ]

    if (matchingSerialNumberIds.length > 0) {
      searchFilters.push(
        `serial_number_id.in.(${matchingSerialNumberIds.join(',')})`
      )
    }

    query = query.or(
      searchFilters.join(',')
    )
  }

  if (selectedStatuses.length > 0) {
    query = query.in(
      'status',
      selectedStatuses
    )
  }

  if (selectedProducts.length > 0) {
    query = query.in(
      'product_group_id',
      selectedProducts
    )
  }

  const { data, error } = await query

  if (error) {
    console.error(
      'Service overview error:',
      error
    )

    throw new Error(
      `Servicefälle konnten nicht geladen werden: ${error.message}`
    )
  }

  const serviceRequests = data ?? []

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
            Servicefälle
          </h1>

          <p className="mt-1 text-gray-500">
            {serviceRequests.length}{' '}
            Servicefälle gefunden
          </p>
        </div>

        <form
          method="get"
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
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
              placeholder="Servicenummer, SN, Kunde, E-Mail, Telefon, Problem..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            <fieldset className="rounded-xl border border-gray-200 p-5">
              <legend className="px-2 text-sm font-semibold">
                Status
              </legend>

              <p className="mb-4 text-xs text-gray-500">
                Keine Auswahl bedeutet: alle Status
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-3">

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="status"
                    value="new"
                    defaultChecked={
                      selectedStatuses.includes('new')
                    }
                    className="h-4 w-4"
                  />

                  <span>Neu</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="status"
                    value="in_progress"
                    defaultChecked={
                      selectedStatuses.includes(
                        'in_progress'
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span>In Bearbeitung</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="status"
                    value="completed"
                    defaultChecked={
                      selectedStatuses.includes(
                        'completed'
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span>Abgeschlossen</span>
                </label>

              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-gray-200 p-5">
              <legend className="px-2 text-sm font-semibold">
                Produktgruppe
              </legend>

              <p className="mb-4 text-xs text-gray-500">
                Keine Auswahl bedeutet: alle Produktgruppen
              </p>

              <div className="grid gap-3 sm:grid-cols-2">

                {productGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      name="product"
                      value={group.id}
                      defaultChecked={
                        selectedProducts.includes(
                          group.id
                        )
                      }
                      className="h-4 w-4"
                    />

                    <span>
                      {group.name}
                      <span className="ml-1 text-xs text-gray-400">
                        ({group.code})
                      </span>
                    </span>
                  </label>
                ))}

              </div>
            </fieldset>

          </div>

          <div className="mt-6 flex flex-wrap gap-3">

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
                      Eingang Servicemeldung
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {serviceRequests.map((request) => {
                    const customer =
                      Array.isArray(request.customers)
                        ? request.customers[0]
                        : request.customers

                    const productGroup =
                      Array.isArray(
                        request.product_groups
                      )
                        ? request.product_groups[0]
                        : request.product_groups

                    const serialNumber =
                      Array.isArray(
                        request.serial_numbers
                      )
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
                          <StatusBadge
                            status={request.status}
                          />
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
                          {serialNumber?.serial_number ??
                            '–'}
                        </td>

                        <td className="max-w-sm truncate px-5 py-4">
                          {request.problem_description}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {new Intl.DateTimeFormat(
                            'de-AT',
                            {
                              dateStyle: 'short',
                              timeStyle: 'short',
                              timeZone:
                                'Europe/Vienna',
                            }
                          ).format(
                            new Date(
                              request.created_at
                            )
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
