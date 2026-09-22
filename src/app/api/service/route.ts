import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  
  const rateLimitSalt = process.env.RATE_LIMIT_SALT

  if (!rateLimitSalt) {
    console.error('RATE_LIMIT_SALT is missing')

    return NextResponse.json(
      { error: 'Serverkonfiguration unvollständig.' },
      { status: 500 }
    )
  }

  const forwardedFor = request.headers.get('x-forwarded-for')

  const clientIp =
    forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'

  const rateKey = createHmac('sha256', rateLimitSalt)
    .update(`service:${clientIp}`)
    .digest('hex')

  const rateLimitClient = createAdminClient()

  const {
    data: rateLimitAllowed,
    error: rateLimitError,
  } = await rateLimitClient.rpc('check_service_rate_limit', {
    p_rate_key: rateKey,
    p_limit: 12,
    p_window_seconds: 600,
  })

  if (rateLimitError) {
    console.error('Service rate-limit error:', rateLimitError)

    return NextResponse.json(
      {
        error:
          'Die Serviceanfrage kann momentan nicht verarbeitet werden. Bitte versuchen Sie es später erneut.',
      },
      { status: 503 }
    )
  }

  if (!rateLimitAllowed) {
    return NextResponse.json(
      {
        error:
          'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einigen Minuten erneut.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '600',
        },
      }
    )
  }

try {
    const body = await request.json()

    const requiredFields = [
      'customer_name',
      'first_name',
      'last_name',
      'email',
      'product_group_id',
      'serial_number',
      'problem_description',
    ]

    for (const field of requiredFields) {
      if (!String(body[field] ?? '').trim()) {
        return NextResponse.json(
          { error: 'Bitte alle Pflichtfelder ausfüllen.' },
          { status: 400 }
        )
      }
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc(
      'create_service_request',
      {
        p_customer_name: body.customer_name,
        p_salutation: body.salutation ?? '',
        p_first_name: body.first_name,
        p_last_name: body.last_name,
        p_email: body.email,
        p_phone: body.phone ?? '',
        p_street_address: body.street_address ?? '',
        p_postal_code: body.postal_code ?? '',
        p_city: body.city ?? '',
        p_country: body.country ?? 'Austria',
        p_product_group_id: body.product_group_id,
        p_serial_number: body.serial_number,
        p_problem_description: body.problem_description,
      }
    )

    if (error) {
      console.error('Service request error:', error)

      if (
        error.message.includes(
          'Serial number does not belong to selected product group'
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Diese Seriennummer gehört nicht zur ausgewählten Produktgruppe.',
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error:
            'Der Servicefall konnte nicht gespeichert werden.',
        },
        { status: 500 }
      )
    }

    const result = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      serviceRequestId: result.service_request_id,
      serviceNumber: result.service_number,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Es ist ein unerwarteter Fehler aufgetreten.' },
      { status: 500 }
    )
  }
}
