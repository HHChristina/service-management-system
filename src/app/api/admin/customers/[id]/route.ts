import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url), 303)
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
    return new NextResponse('Nicht berechtigt', { status: 403 })
  }

  const formData = await request.formData()

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const postalCode = String(formData.get('postal_code') ?? '').trim()
  const city = String(formData.get('city') ?? '').trim()
  const country = String(formData.get('country') ?? '').trim()

  if (!name) {
    return new NextResponse('Kundenname darf nicht leer sein', {
      status: 400,
    })
  }

  if (email && !email.includes('@')) {
    return new NextResponse('Ungültige E-Mail-Adresse', {
      status: 400,
    })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('customers')
    .update({
      name,
      email: email || null,
      phone: phone || null,
      postal_code: postalCode || null,
      city: city || null,
      country: country || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Customer update error:', error)

    return new NextResponse(
      'Kundendaten konnten nicht gespeichert werden',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/customers/${id}`, request.url),
    303
  )
}
