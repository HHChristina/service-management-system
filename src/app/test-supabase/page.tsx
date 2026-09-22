import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function TestSupabasePage() {
  const supabase = createAdminClient()

  const { data: productGroups, error } = await supabase
    .from('product_groups')
    .select('name, code')
    .order('sort_order')

  if (error) {
    return (
      <main style={{ padding: '40px' }}>
        <h1>Supabase Fehler</h1>
        <pre>{error.message}</pre>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px' }}>
      <h1>Supabase Verbindung funktioniert ✅</h1>

      <ul style={{ marginTop: '20px' }}>
        {productGroups?.map((group) => (
          <li key={group.code}>
            {group.name} – {group.code}
          </li>
        ))}
      </ul>
    </main>
  )
}
