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
  const note = String(formData.get('note') ?? '').trim()

  if (!note) {
    return new NextResponse('Notiz darf nicht leer sein', {
      status: 400,
    })
  }

  if (note.length > 5000) {
    return new NextResponse('Notiz ist zu lang', {
      status: 400,
    })
  }

  const { error } = await supabase
    .from('service_notes')
    .insert({
      service_request_id: id,
      note,
      created_by: userId,
    })

  if (error) {
    console.error(error)
    return new NextResponse('Notiz konnte nicht gespeichert werden', {
      status: 500,
    })
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
