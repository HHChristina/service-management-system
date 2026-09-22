import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const finalFault = String(
    formData.get('final_fault') ?? ''
  ).trim()

  if (finalFault.length > 5000) {
    return new NextResponse(
      'Der festgestellte Fehler ist zu lang.',
      { status: 400 }
    )
  }

  const { data: serviceRequest } = await supabase
    .from('service_requests')
    .select('status')
    .eq('id', id)
    .single()

  if (!serviceRequest) {
    return new NextResponse(
      'Servicefall wurde nicht gefunden.',
      { status: 404 }
    )
  }

  if (
    serviceRequest.status === 'completed' &&
    !finalFault
  ) {
    return new NextResponse(
      'Bei einem abgeschlossenen Servicefall darf der festgestellte Fehler nicht leer sein.',
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('service_requests')
    .update({
      final_fault: finalFault || null,
    })
    .eq('id', id)

  if (error) {
    console.error('Final fault update error:', error)

    return new NextResponse(
      'Festgestellter Fehler konnte nicht gespeichert werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
