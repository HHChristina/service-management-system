import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const PUBLIC_UPLOAD_WINDOW_MS = 30 * 60 * 1000

function isAllowedMimeType(type: string) {
  return (
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    type === 'application/pdf'
  )
}

function sanitizeFileName(name: string) {
  const sanitized = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')

  return sanitized.slice(-120) || 'attachment'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const serviceRequestId = String(body.serviceRequestId ?? '')
    const fileName = String(body.fileName ?? '')
    const contentType = String(body.contentType ?? '')
    const fileSize = Number(body.fileSize ?? 0)

    if (!serviceRequestId || !fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Ungültige Upload-Daten.' },
        { status: 400 }
      )
    }

    if (!isAllowedMimeType(contentType)) {
      return NextResponse.json(
        { error: 'Dieser Dateityp ist nicht erlaubt.' },
        { status: 400 }
      )
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Eine Datei darf maximal 50 MB groß sein.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: serviceRequest, error: requestError } =
      await supabase
        .from('service_requests')
        .select('id, service_number, created_at')
        .eq('id', serviceRequestId)
        .single()

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { error: 'Servicefall wurde nicht gefunden.' },
        { status: 404 }
      )
    }

    const createdAt = new Date(serviceRequest.created_at).getTime()

    if (
      !Number.isFinite(createdAt) ||
      Date.now() - createdAt > PUBLIC_UPLOAD_WINDOW_MS
    ) {
      return NextResponse.json(
        {
          error:
            'Das Zeitfenster für öffentliche Anhänge ist abgelaufen.',
        },
        { status: 403 }
      )
    }

    const safeName = sanitizeFileName(fileName)

    const storagePath =
      `${serviceRequest.service_number}/` +
      `${randomUUID()}-${safeName}`

    const { data, error } = await supabase.storage
      .from('service-attachments')
      .createSignedUploadUrl(storagePath)

    if (error || !data?.token) {
      console.error('Signed upload URL error:', error)

      return NextResponse.json(
        { error: 'Upload konnte nicht vorbereitet werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      path: storagePath,
      token: data.token,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Upload konnte nicht vorbereitet werden.' },
      { status: 500 }
    )
  }
}
