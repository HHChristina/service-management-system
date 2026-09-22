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
  const currentUserId = claimsData?.claims?.sub

  if (!currentUserId) {
    return NextResponse.redirect(
      new URL('/login', request.url),
      303
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', currentUserId)
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

  if (id === currentUserId) {
    return new NextResponse(
      'Der eigene Admin-Benutzer kann nicht gelöscht werden.',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { error } =
    await admin.auth.admin.deleteUser(id)

  if (error) {
    console.error('Delete employee error:', error)

    return new NextResponse(
      'Benutzer konnte nicht gelöscht werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL('/admin/users', request.url),
    303
  )
}
