import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProductGroupsPage() {
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
    productGroupsResult,
    serialNumbersResult,
    serviceRequestsResult,
  ] = await Promise.all([
    supabase
      .from('product_groups')
      .select('id, name, code, is_active')
      .order('name'),

    supabase
      .from('serial_numbers')
      .select('product_group_id'),

    supabase
      .from('service_requests')
      .select('product_group_id'),
  ])

  if (productGroupsResult.error) {
    throw new Error(
      `Produktgruppen konnten nicht geladen werden: ${productGroupsResult.error.message}`
    )
  }

  const productGroups = productGroupsResult.data ?? []
  const serialNumbers = serialNumbersResult.data ?? []
  const serviceRequests = serviceRequestsResult.data ?? []

  const serialCounts = new Map<string, number>()
  const serviceCounts = new Map<string, number>()

  serialNumbers.forEach((item) => {
    serialCounts.set(
      item.product_group_id,
      (serialCounts.get(item.product_group_id) ?? 0) + 1
    )
  })

  serviceRequests.forEach((item) => {
    serviceCounts.set(
      item.product_group_id,
      (serviceCounts.get(item.product_group_id) ?? 0) + 1
    )
  })

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/admin"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-3">
          <h1 className="text-3xl font-bold">
            Produktgruppen
          </h1>

          <p className="mt-1 text-gray-500">
            Übersicht aller Service-Produktgruppen
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {productGroups.map((group) => (
            <Link
              key={group.id}
              href={`/admin/products/${group.id}`}
              className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    {group.code}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {group.name}
                  </h2>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                  {group.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Seriennummern
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {serialCounts.get(group.id) ?? 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Servicefälle
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {serviceCounts.get(group.id) ?? 0}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}
