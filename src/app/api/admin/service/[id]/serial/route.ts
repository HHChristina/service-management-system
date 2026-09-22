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

  const correctedSerialNumber = String(
    formData.get('corrected_serial_number') ?? ''
  ).trim()

  if (!correctedSerialNumber) {
    return new NextResponse(
      'Seriennummer darf nicht leer sein',
      { status: 400 }
    )
  }

  if (correctedSerialNumber.length > 150) {
    return new NextResponse(
      'Seriennummer ist zu lang',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: serviceRequest, error: serviceError } =
    await admin
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
    return new NextResponse(
      'Servicefall wurde nicht gefunden',
      { status: 404 }
    )
  }

  const { data: currentSerial, error: currentSerialError } =
    await admin
      .from('serial_numbers')
      .select(`
        id,
        serial_number,
        customer_id,
        product_group_id
      `)
      .eq('id', serviceRequest.serial_number_id)
      .single()

  if (currentSerialError || !currentSerial) {
    return new NextResponse(
      'Aktuelle Seriennummer wurde nicht gefunden',
      { status: 404 }
    )
  }

  if (
    currentSerial.serial_number === correctedSerialNumber
  ) {
    return NextResponse.redirect(
      new URL(`/admin/service/${id}`, request.url),
      303
    )
  }

  /*
   * Alle Servicefälle merken, die aktuell an der
   * falschen SN hängen.
   */
  const { data: affectedRequests, error: affectedError } =
    await admin
      .from('service_requests')
      .select('id')
      .eq('serial_number_id', currentSerial.id)

  if (affectedError) {
    console.error(
      'Affected service requests error:',
      affectedError
    )

    return new NextResponse(
      'Verknüpfte Servicefälle konnten nicht geprüft werden',
      { status: 500 }
    )
  }

  /*
   * Prüfen, ob die korrigierte SN bereits existiert.
   */
  const { data: existingSerial, error: existingError } =
    await admin
      .from('serial_numbers')
      .select(`
        id,
        serial_number,
        customer_id,
        product_group_id
      `)
      .ilike('serial_number', correctedSerialNumber)
      .maybeSingle()

  if (existingError) {
    console.error(
      'Existing serial lookup error:',
      existingError
    )

    return new NextResponse(
      'Seriennummer konnte nicht geprüft werden',
      { status: 500 }
    )
  }

  /*
   * Fall 1:
   * Die richtige SN existiert bereits.
   *
   * Dann werden alle Fälle von der falschen SN
   * auf die richtige SN umgehängt und die falsche
   * SN anschließend gelöscht.
   */
  if (
    existingSerial &&
    existingSerial.id !== currentSerial.id
  ) {
    if (
      existingSerial.customer_id !==
        serviceRequest.customer_id ||
      existingSerial.product_group_id !==
        serviceRequest.product_group_id
    ) {
      return new NextResponse(
        'Die korrigierte Seriennummer existiert bereits bei einem anderen Kunden oder einer anderen Produktgruppe.',
        { status: 409 }
      )
    }

    const { error: reassignError } = await admin
      .from('service_requests')
      .update({
        serial_number_id: existingSerial.id,
      })
      .eq('serial_number_id', currentSerial.id)

    if (reassignError) {
      console.error(
        'Serial reassignment error:',
        reassignError
      )

      return new NextResponse(
        'Servicefälle konnten nicht auf die richtige Seriennummer umgestellt werden',
        { status: 500 }
      )
    }

    const { error: deleteError } = await admin
      .from('serial_numbers')
      .delete()
      .eq('id', currentSerial.id)

    if (deleteError) {
      console.error(
        'Old serial delete error:',
        deleteError
      )

      return new NextResponse(
        'Die alte Seriennummer konnte nicht entfernt werden',
        { status: 500 }
      )
    }
  } else {
    /*
     * Fall 2:
     * Die korrigierte SN existiert noch nicht.
     *
     * Dann ändern wir den bestehenden SN-Datensatz
     * direkt. Dadurch bleiben Kunde und komplette
     * Servicehistorie erhalten.
     */
    const { error: updateError } = await admin
      .from('serial_numbers')
      .update({
        serial_number: correctedSerialNumber,
      })
      .eq('id', currentSerial.id)

    if (updateError) {
      console.error(
        'Serial correction error:',
        updateError
      )

      return new NextResponse(
        'Seriennummer konnte nicht korrigiert werden',
        { status: 500 }
      )
    }
  }

  /*
   * Korrektur zur Nachvollziehbarkeit
   * in den betroffenen Servicefällen dokumentieren.
   */
  const note =
    `SN-Tippfehler korrigiert: ` +
    `${currentSerial.serial_number} → ${correctedSerialNumber}`

  const notes =
    (affectedRequests ?? []).map((service) => ({
      service_request_id: service.id,
      note,
      created_by: userId,
    }))

  if (notes.length > 0) {
    const { error: noteError } = await admin
      .from('service_notes')
      .insert(notes)

    if (noteError) {
      console.error(
        'Serial correction note error:',
        noteError
      )
    }
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
