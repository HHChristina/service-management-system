import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const allowedWarrantyTypes = [
  '3_years_on_site',
  '3_years_bring_in',
  '5_years_on_site',
  '5_years_bring_in',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return NextResponse.redirect(
      new URL('/login', request.url),
      303
    )
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
    return new NextResponse('Nicht berechtigt', {
      status: 403,
    })
  }

  const formData = await request.formData()

  const installationDate = String(
    formData.get('installation_date') ?? ''
  ).trim()

  const warrantyType = String(
    formData.get('warranty_type') ?? ''
  ).trim()

  if (
    warrantyType &&
    !allowedWarrantyTypes.includes(warrantyType)
  ) {
    return new NextResponse(
      'Ungültiger Garantietyp',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('serial_numbers')
    .update({
      installation_date: installationDate || null,
      warranty_type: warrantyType || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Warranty update error:', error)

    return new NextResponse(
      'Garantiedaten konnten nicht gespeichert werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/serial/${id}`, request.url),
    303
  )
}
