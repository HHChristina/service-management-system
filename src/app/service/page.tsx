import { createAdminClient } from '@/lib/supabase/admin'
import ServiceForm from './service-form'

export const dynamic = 'force-dynamic'

export default async function ServicePage() {
  const supabase = createAdminClient()

  const { data: productGroups, error } = await supabase
    .from('product_groups')
    .select('id, name, code')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">
          Servicefall melden
        </h1>

        <p className="mt-4">
          Die Produktgruppen konnten nicht geladen werden.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Servicefall melden
        </h1>

        <p className="mt-2 text-gray-600">
          Bitte füllen Sie das Formular vollständig aus.
        </p>

        <ServiceForm productGroups={productGroups ?? []} />
      </div>
    </main>
  )
}
