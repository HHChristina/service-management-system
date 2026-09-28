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
    profile.role !== 'admin'
  ) {
    return new NextResponse(
      'Nur Admins dürfen diese Markierung entfernen.',
      { status: 403 }
    )
  }

  const { data: serviceRequest } = await supabase
    .from('service_requests')
    .select('status, self_repair_marker')
    .eq('id', id)
    .single()

  if (!serviceRequest) {
    return new NextResponse(
      'Servicefall wurde nicht gefunden.',
      { status: 404 }
    )
  }

  if (serviceRequest.status === 'customer_self_repair') {
    return new NextResponse(
      'Bitte zuerst den aktuellen Status von "Selbstreparatur durch Kunde" auf den tatsächlich richtigen Status ändern.',
      { status: 400 }
    )
  }

  const { error: updateError } = await supabase
    .from('service_requests')
    .update({
      self_repair_marker: false,
    })
    .eq('id', id)

  if (updateError) {
    console.error(
      'Self repair marker reset error:',
      updateError
    )

    return new NextResponse(
      'Orange-Markierung konnte nicht entfernt werden.',
      { status: 500 }
    )
  }

  if (serviceRequest.self_repair_marker) {
    const { error: noteError } = await supabase
      .from('service_notes')
      .insert({
        service_request_id: id,
        note:
          'Orange Selbstreparatur-Markierung wurde durch einen Admin entfernt.',
        created_by: userId,
      })

    if (noteError) {
      console.error(
        'Self repair marker reset note error:',
        noteError
      )
    }
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
