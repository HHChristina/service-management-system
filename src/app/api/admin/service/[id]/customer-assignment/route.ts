import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const allowedActions = [
  'confirm_new_customer',
  'assign_existing_customer',
  'use_existing_location',
  'create_location',
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
    return new NextResponse(
      'Nicht berechtigt',
      { status: 403 }
    )
  }

  const formData = await request.formData()

  const action = String(
    formData.get('action') ?? ''
  ).trim()

  const targetCustomerId =
    String(
      formData.get('target_customer_id') ?? ''
    ).trim() || null

  const targetLocationId =
    String(
      formData.get('target_location_id') ?? ''
    ).trim() || null

  if (!allowedActions.includes(action)) {
    return new NextResponse(
      'Ungültige Zuordnungsaktion.',
      { status: 400 }
    )
  }

  if (
    action === 'assign_existing_customer' &&
    !targetCustomerId
  ) {
    return new NextResponse(
      'Bitte einen bestehenden Kunden auswählen.',
      { status: 400 }
    )
  }

  if (
    action === 'use_existing_location' &&
    !targetLocationId
  ) {
    return new NextResponse(
      'Bitte einen Standort auswählen.',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Bereits erfolgreich bestätigte Zuordnung:
  // Bei erneutem Klick einfach zurück zum Servicefall.
  if (action === 'confirm_new_customer') {
    const { data: currentRequest } = await admin
      .from('service_requests')
      .select('customer_assignment_status')
      .eq('id', id)
      .single()

    if (
      currentRequest?.customer_assignment_status ===
      'confirmed'
    ) {
      return NextResponse.redirect(
        new URL(`/admin/service/${id}`, request.url),
        303
      )
    }
  }

  const { error } = await admin.rpc(
    'resolve_service_customer_assignment',
    {
      p_service_request_id: id,
      p_action: action,
      p_target_customer_id: targetCustomerId,
      p_target_location_id: targetLocationId,
    }
  )

  if (error) {
    console.error(
      'Customer assignment error:',
      error
    )

    return new NextResponse(
      `Kundenzuordnung konnte nicht gespeichert werden: ${error.message}`,
      { status: 500 }
    )
  }

  const noteTexts: Record<string, string> = {
    confirm_new_customer:
      'Kundenzuordnung geprüft: als neuer Kunde bestätigt.',

    assign_existing_customer:
      'Kundenzuordnung geprüft: einem bestehenden Kunden zugeordnet.',

    use_existing_location:
      'Kundenzuordnung geprüft: vorhandener Standort ausgewählt.',

    create_location:
      'Kundenzuordnung geprüft: gemeldete Adresse als neuer Standort angelegt.',
  }

  const { error: noteError } = await admin
    .from('service_notes')
    .insert({
      service_request_id: id,
      note: noteTexts[action],
      created_by: userId,
    })

  if (noteError) {
    console.error(
      'Customer assignment note error:',
      noteError
    )
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
