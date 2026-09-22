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

  const admin = createAdminClient()

  const { data: serviceRequest, error: serviceError } = await admin
    .from('service_requests')
    .select(`
      id,
      customer_id,
      product_group_id,
      serial_number_id
    `)
    .eq('id', id)
    .single()

  if (serviceError || !serviceRequest) {
    return new NextResponse('Servicefall wurde nicht gefunden', {
      status: 404,
    })
  }

  const { data: oldSerial } = await admin
    .from('serial_numbers')
    .select('id, serial_number')
    .eq('id', serviceRequest.serial_number_id)
    .single()

  const formData = await request.formData()
  const mode = String(formData.get('mode') ?? '')

  let targetSerial: {
    id: string
    serial_number: string
  } | null = null

  let newlyCreatedSerialId: string | null = null

  if (mode === 'existing') {
    const serialNumberId = String(
      formData.get('serial_number_id') ?? ''
    )

    if (!serialNumberId) {
      return new NextResponse(
        'Bitte eine Seriennummer auswählen',
        { status: 400 }
      )
    }

    const { data: selectedSerial, error } = await admin
      .from('serial_numbers')
      .select(`
        id,
        serial_number,
        customer_id,
        product_group_id
      `)
      .eq('id', serialNumberId)
      .single()

    if (error || !selectedSerial) {
      return new NextResponse(
        'Seriennummer wurde nicht gefunden',
        { status: 404 }
      )
    }

    if (
      selectedSerial.customer_id !== serviceRequest.customer_id ||
      selectedSerial.product_group_id !==
        serviceRequest.product_group_id
    ) {
      return new NextResponse(
        'Diese Seriennummer gehört nicht zu diesem Kunden und dieser Produktgruppe',
        { status: 400 }
      )
    }

    targetSerial = {
      id: selectedSerial.id,
      serial_number: selectedSerial.serial_number,
    }
  } else if (mode === 'new') {
    const newSerialNumber = String(
      formData.get('new_serial_number') ?? ''
    ).trim()

    if (!newSerialNumber) {
      return new NextResponse(
        'Bitte eine neue Seriennummer eingeben',
        { status: 400 }
      )
    }

    if (newSerialNumber.length > 150) {
      return new NextResponse(
        'Seriennummer ist zu lang',
        { status: 400 }
      )
    }

    const { data: createdSerial, error } = await admin
      .from('serial_numbers')
      .insert({
        serial_number: newSerialNumber,
        customer_id: serviceRequest.customer_id,
        product_group_id: serviceRequest.product_group_id,
      })
      .select('id, serial_number')
      .single()

    if (error || !createdSerial) {
      console.error('Create serial number error:', error)

      if (error?.code === '23505') {
        return new NextResponse(
          'Diese Seriennummer existiert bereits. Bitte die vorhandene Seriennummer auswählen.',
          { status: 409 }
        )
      }

      return new NextResponse(
        'Neue Seriennummer konnte nicht angelegt werden',
        { status: 500 }
      )
    }

    newlyCreatedSerialId = createdSerial.id
    targetSerial = createdSerial
  } else {
    return new NextResponse(
      'Ungültige Aktion',
      { status: 400 }
    )
  }

  if (!targetSerial) {
    return new NextResponse(
      'Keine Seriennummer ausgewählt',
      { status: 400 }
    )
  }

  if (targetSerial.id === serviceRequest.serial_number_id) {
    return NextResponse.redirect(
      new URL(`/admin/service/${id}`, request.url),
      303
    )
  }

  const { error: updateError } = await admin
    .from('service_requests')
    .update({
      serial_number_id: targetSerial.id,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Service serial update error:', updateError)

    if (newlyCreatedSerialId) {
      await admin
        .from('serial_numbers')
        .delete()
        .eq('id', newlyCreatedSerialId)
    }

    return new NextResponse(
      'Seriennummer konnte dem Servicefall nicht zugeordnet werden',
      { status: 500 }
    )
  }

  const oldSerialNumber =
    oldSerial?.serial_number ?? 'Unbekannt'

  const { error: noteError } = await admin
    .from('service_notes')
    .insert({
      service_request_id: id,
      note:
        `Seriennummer korrigiert: ` +
        `${oldSerialNumber} → ${targetSerial.serial_number}`,
      created_by: userId,
    })

  if (noteError) {
    console.error(
      'Serial correction audit note error:',
      noteError
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
