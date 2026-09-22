import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  const claims = claimsData?.claims

  if (claimsError || !claims?.sub) {
    redirect('/login')
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('email, display_name, role, is_active')
      .eq('id', claims.sub)
      .single()

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !['admin', 'staff'].includes(profile.role)
  ) {
    redirect('/login')
  }

  const [
    serviceRequestsResult,
    customersResult,
    serialNumbersResult,
    productGroupsResult,
    newResult,
    inProgressResult,
    completedResult,
    recentRequestsResult,
  ] = await Promise.all([
    supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('serial_numbers')
      .select('*', { count: 'exact', head: true }),

    supabase
      .from('product_groups')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),

    supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress'),

    supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),

    supabase
      .from('service_requests')
      .select(`
        id,
        service_number,
        status,
        problem_description,
        created_at,
        customers (
          name
        ),
        product_groups (
          name
        ),
        serial_numbers (
          serial_number
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const recentRequests = recentRequestsResult.data ?? []

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Service Management
            </h1>

            <p className="mt-2 text-gray-600">
              Angemeldet als{' '}
              {profile.display_name || profile.email}
            </p>

            <p className="text-sm text-gray-500">
              Rolle: {profile.role}
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50"
            >
              Abmelden
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Servicefälle
            </p>
            <p className="mt-2 text-3xl font-bold">
              {serviceRequestsResult.count ?? 0}
            </p>
          </div>

          <Link
            href="/admin/customers"
            className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm text-gray-500">
              Kunden
            </p>
            <p className="mt-2 text-3xl font-bold">
              {customersResult.count ?? 0}
            </p>
          </Link>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Seriennummern
            </p>
            <p className="mt-2 text-3xl font-bold">
              {serialNumbersResult.count ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Produktgruppen
            </p>
            <p className="mt-2 text-3xl font-bold">
              {productGroupsResult.count ?? 0}
            </p>
          </div>

        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Neu
            </p>
            <p className="mt-2 text-4xl font-bold">
              {newResult.count ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              In Bearbeitung
            </p>
            <p className="mt-2 text-4xl font-bold">
              {inProgressResult.count ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Abgeschlossen
            </p>
            <p className="mt-2 text-4xl font-bold">
              {completedResult.count ?? 0}
            </p>
          </div>

        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Aktuelle Servicefälle
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Die zuletzt eingegangenen Serviceanfragen
              </p>
            </div>

            <Link
              href="/admin/service"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Alle Servicefälle
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              Noch keine Servicefälle vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                  {recentRequests.map((request) => {
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
                        className="border-b last:border-0"
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
                          {request.status === 'new' && 'Neu'}
                          {request.status === 'in_progress' &&
                            'In Bearbeitung'}
                          {request.status === 'completed' &&
                            'Abgeschlossen'}
                        </td>

                        <td className="px-3 py-4">
                          {customer?.name ?? '–'}
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
        </div>
      </div>
    </main>
  )
}
