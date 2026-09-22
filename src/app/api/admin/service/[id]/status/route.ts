import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedStatuses = ['new', 'in_progress', 'completed']

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
  const status = String(formData.get('status') ?? '')

  if (!allowedStatuses.includes(status)) {
    return new NextResponse('Ungültiger Status', { status: 400 })
  }

  const { error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error(error)
    return new NextResponse('Status konnte nicht gespeichert werden', {
      status: 500,
    })
  }

  return NextResponse.redirect(
    new URL(`/admin/service/${id}`, request.url),
    303
  )
}
