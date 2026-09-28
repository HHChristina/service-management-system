import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = [
  'warranty',
  'customer_fault',
  'out_of_warranty',
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

  const handlingStatus = String(
    formData.get('handling_status') ?? ''
  ).trim()

  if (
    handlingStatus &&
    !allowedStatuses.includes(handlingStatus)
  ) {
    return new NextResponse(
      'Ungültiger Abwicklungsstatus',
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      handling_status: handlingStatus || null,
      handling_status_manual: Boolean(handlingStatus),
    })
    .eq('id', id)

  if (error) {
    console.error(
      'Handling status update error:',
      error
    )

    return new NextResponse(
      'Abwicklungsstatus konnte nicht gespeichert werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
