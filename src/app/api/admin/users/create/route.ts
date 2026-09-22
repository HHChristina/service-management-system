import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
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

  const displayName = String(
    formData.get('display_name') ?? ''
  ).trim()

  const email = String(
    formData.get('email') ?? ''
  )
    .trim()
    .toLowerCase()

  const password = String(
    formData.get('password') ?? ''
  )

  const role = String(
    formData.get('role') ?? 'staff'
  )

  if (!displayName || !email || !password) {
    return new NextResponse(
      'Bitte alle Pflichtfelder ausfüllen',
      { status: 400 }
    )
  }

  if (!['staff', 'admin'].includes(role)) {
    return new NextResponse(
      'Ungültige Rolle',
      { status: 400 }
    )
  }

  if (password.length < 12) {
    return new NextResponse(
      'Das Passwort muss mindestens 12 Zeichen lang sein',
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const {
    data: created,
    error: createError,
  } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
    },
  })

  if (createError || !created.user) {
    console.error('Create employee error:', createError)

    return new NextResponse(
      createError?.message?.toLowerCase().includes('already')
        ? 'Für diese E-Mail existiert bereits ein Benutzer.'
        : 'Mitarbeiter konnte nicht angelegt werden.',
      {
        status:
          createError?.message?.toLowerCase().includes('already')
            ? 409
            : 500,
      }
    )
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      display_name: displayName,
      role,
      is_active: true,
    })
    .eq('id', created.user.id)

  if (profileError) {
    console.error(
      'Employee profile update error:',
      profileError
    )

    await admin.auth.admin.deleteUser(created.user.id)

    return new NextResponse(
      'Mitarbeiterprofil konnte nicht eingerichtet werden.',
      { status: 500 }
    )
  }

  return NextResponse.redirect(
    new URL('/admin/users', request.url),
    303
  )
}
