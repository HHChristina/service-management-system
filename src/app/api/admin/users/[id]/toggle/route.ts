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
    profile.role !== 'admin'
  ) {
    return new NextResponse('Nicht berechtigt', {
      status: 403,
    })
  }

  const formData = await request.formData()

  const isActive =
    String(formData.get('is_active')) === 'true'

  if (id === userId && !isActive) {
    return new NextResponse(
      'Der eigene Admin-Benutzer kann nicht deaktiviert werden.',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({
      is_active: isActive,
    })
    .eq('id', id)

  if (error) {
    console.error('Employee status update error:', error)

    return new NextResponse(
      'Mitarbeiterstatus konnte nicht geändert werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL('/admin/users', request.url),
    303
  )
}
