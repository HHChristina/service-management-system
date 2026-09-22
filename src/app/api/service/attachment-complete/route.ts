import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const PUBLIC_UPLOAD_WINDOW_MS = 30 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const serviceRequestId = String(body.serviceRequestId ?? '')
    const storagePath = String(body.storagePath ?? '')
    const originalFileName = String(body.originalFileName ?? '')
    const mimeType = String(body.mimeType ?? '')
    const fileSize = Number(body.fileSize ?? 0)

    if (
      !serviceRequestId ||
      !storagePath ||
      !originalFileName ||
      !mimeType ||
      !fileSize
    ) {
      return NextResponse.json(
        { error: 'Ungültige Datei-Metadaten.' },
        { status: 400 }
      )
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ungültige Dateigröße.' },
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
        { error: 'Das Upload-Zeitfenster ist abgelaufen.' },
        { status: 403 }
      )
    }

    if (!storagePath.startsWith(`${serviceRequest.service_number}/`)) {
      return NextResponse.json(
        { error: 'Ungültiger Speicherpfad.' },
        { status: 400 }
      )
    }

    const parts = storagePath.split('/')
    const storedFileName = parts.pop()

    if (!storedFileName) {
      return NextResponse.json(
        { error: 'Ungültiger Speicherpfad.' },
        { status: 400 }
      )
    }

    const folder = parts.join('/')

    const { data: storedObjects, error: listError } =
      await supabase.storage
        .from('service-attachments')
        .list(folder, {
          search: storedFileName,
          limit: 20,
        })

    if (listError) {
      console.error('Storage verification error:', listError)

      return NextResponse.json(
        { error: 'Datei konnte nicht geprüft werden.' },
        { status: 500 }
      )
    }

    const exists = storedObjects?.some(
      (object) => object.name === storedFileName
    )

    if (!exists) {
      return NextResponse.json(
        { error: 'Die hochgeladene Datei wurde nicht gefunden.' },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase
      .from('service_attachments')
      .insert({
        service_request_id: serviceRequestId,
        storage_path: storagePath,
        original_file_name: originalFileName,
        mime_type: mimeType,
        file_size_bytes: fileSize,
      })

    if (insertError) {
      console.error('Attachment database error:', insertError)

      return NextResponse.json(
        { error: 'Datei konnte nicht registriert werden.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Datei konnte nicht registriert werden.' },
      { status: 500 }
    )
  }
}
