import Link from 'next/link'
import ServiceStatusForm from '@/components/admin/service-status-form'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function statusLabel(status: string) {
  if (status === 'new') return 'Neu'
  if (status === 'in_progress') return 'In Bearbeitung'
  if (status === 'completed') return 'Abgeschlossen'
  return status
}

export default async function ServiceRequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  const claims = claimsData?.claims

  if (claimsError || !claims?.sub) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', claims.sub)
    .single()

  if (
    !profile ||
    !profile.is_active ||
    !['admin', 'staff'].includes(profile.role)
  ) {
    redirect('/login')
  }

  const { data: serviceRequest, error } = await supabase
    .from('service_requests')
    .select(`
      id,
      customer_id,
      product_group_id,
      serial_number_id,
      service_number,
      status,
      problem_description,
      final_fault,
      created_at,
      updated_at,
      contact_customer_name,
      contact_salutation,
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_street_address,
      contact_postal_code,
      contact_city,
      contact_country,
      customers (
        id,
        name
      ),
      product_groups (
        id,
        name,
        code
      ),
      serial_numbers (
        id,
        serial_number
      )
    `)
    .eq('id', id)
    .single()

  if (error || !serviceRequest) {
    notFound()
  }

  const [
    historyResult,
    notesResult,
    attachmentsResult,
  ] = await Promise.all([
    supabase
      .from('service_status_history')
      .select('id, old_status, new_status, changed_at')
      .eq('service_request_id', id)
      .order('changed_at', { ascending: false }),

    supabase
      .from('service_notes')
      .select('id, note, created_at')
      .eq('service_request_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('service_attachments')
      .select(`
        id,
        storage_path,
        original_file_name,
        mime_type,
        file_size_bytes,
        created_at
      `)
      .eq('service_request_id', id)
      .order('created_at', { ascending: false }),
  ])

  const admin = createAdminClient()

  const attachments = await Promise.all(
    (attachmentsResult.data ?? []).map(async (attachment) => {
      const { data } = await admin.storage
        .from('service-attachments')
        .createSignedUrl(attachment.storage_path, 600)

      return {
        ...attachment,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  const customer = Array.isArray(serviceRequest.customers)
    ? serviceRequest.customers[0]
    : serviceRequest.customers

  const productGroup = Array.isArray(serviceRequest.product_groups)
    ? serviceRequest.product_groups[0]
    : serviceRequest.product_groups

  const serialNumber = Array.isArray(serviceRequest.serial_numbers)
    ? serviceRequest.serial_numbers[0]
    : serviceRequest.serial_numbers

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        <Link
          href="/admin"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← Zurück zum Dashboard
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Servicefall
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                {serviceRequest.service_number}
              </h1>

              <p className="mt-2 text-gray-600">
                Erstellt am{' '}
                {new Intl.DateTimeFormat('de-AT', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Europe/Vienna',
                }).format(new Date(serviceRequest.created_at))}
              </p>
            </div>

            <ServiceStatusForm
              serviceRequestId={serviceRequest.id}
              currentStatus={serviceRequest.status}
              hasFinalFault={Boolean(
                serviceRequest.final_fault?.trim()
              )}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Kunde & Gerät
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-sm text-gray-500">
                  Kunde
                </dt>
                <dd className="font-medium">
                  {customer?.name ?? serviceRequest.contact_customer_name}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Produktgruppe
                </dt>
                <dd className="font-medium">
                  {productGroup?.name ?? '–'}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Seriennummer
                </dt>
                <dd className="font-medium">
                  {serialNumber?.serial_number ?? '–'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Melder
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-sm text-gray-500">
                  Name
                </dt>
                <dd className="font-medium">
                  {[
                    serviceRequest.contact_salutation,
                    serviceRequest.contact_first_name,
                    serviceRequest.contact_last_name,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  E-Mail
                </dt>
                <dd className="font-medium">
                  {serviceRequest.contact_email}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Telefon
                </dt>
                <dd className="font-medium">
                  {serviceRequest.contact_phone || '–'}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-gray-500">
                  Adresse
                </dt>
                <dd className="font-medium">
                  {[
                    serviceRequest.contact_street_address,
                    serviceRequest.contact_postal_code,
                    serviceRequest.contact_city,
                    serviceRequest.contact_country,
                  ]
                    .filter(Boolean)
                    .join(', ') || '–'}
                </dd>
              </div>
            </dl>
          </section>

        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            SN-Tippfehler korrigieren
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Diese Funktion ist ausschließlich für falsch eingegebene
            Seriennummern gedacht. Die bisherige falsche SN wird durch
            die tatsächlich am Gerät vorhandene SN ersetzt.
          </p>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Aktuell gespeicherte SN
            </p>

            <p className="mt-1 font-mono text-lg font-bold text-amber-950">
              {serialNumber?.serial_number ?? '–'}
            </p>
          </div>

          <form
            action={`/api/admin/service/${serviceRequest.id}/serial`}
            method="post"
            className="mt-5"
          >
            <label
              htmlFor="corrected_serial_number"
              className="mb-2 block text-sm font-medium"
            >
              Tatsächliche Seriennummer
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="corrected_serial_number"
                name="corrected_serial_number"
                type="text"
                required
                maxLength={150}
                defaultValue={serialNumber?.serial_number ?? ''}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono"
              />

              <button
                type="submit"
                className="whitespace-nowrap rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
              >
                SN korrigieren
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Problembeschreibung
          </h2>

          <p className="mt-4 whitespace-pre-wrap text-gray-700">
            {serviceRequest.problem_description}
          </p>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Festgestellter Fehler
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Internes Feld. Hier wird nach der Diagnose eingetragen,
            was tatsächlich defekt war.
          </p>

          <form
            action={`/api/admin/service/${serviceRequest.id}/final-fault`}
            method="post"
            className="mt-5"
          >
            <textarea
              name="final_fault"
              rows={4}
              maxLength={5000}
              defaultValue={
                serviceRequest.final_fault ?? ''
              }
              placeholder="z. B. Netzteil defekt, Mainboard ausgefallen, Akku ohne Funktion ..."
              className="w-full rounded-xl border border-gray-300 p-3"
            />

            <button
              type="submit"
              className="mt-3 rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
            >
              Festgestellten Fehler speichern
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Anhänge
          </h2>

          {attachments.length === 0 ? (
            <p className="mt-4 text-gray-500">
              Keine Anhänge vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {attachment.original_file_name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {attachment.mime_type || 'Datei'}
                      {attachment.file_size_bytes
                        ? ` · ${(
                            attachment.file_size_bytes /
                            1024 /
                            1024
                          ).toFixed(2)} MB`
                        : ''}
                    </p>
                  </div>

                  {attachment.signedUrl && (
                    <a
                      href={attachment.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                      Öffnen
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Statushistorie
            </h2>

            {(historyResult.data ?? []).length === 0 ? (
              <p className="mt-4 text-gray-500">
                Keine Historie vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {(historyResult.data ?? []).map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-gray-200 pl-4"
                  >
                    <p className="font-medium">
                      {entry.old_status
                        ? `${statusLabel(entry.old_status)} → ${statusLabel(entry.new_status)}`
                        : `Servicefall erstellt → ${statusLabel(entry.new_status)}`}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {new Intl.DateTimeFormat('de-AT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Europe/Vienna',
                      }).format(new Date(entry.changed_at))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Interne Notizen
            </h2>

            <form
              action={`/api/admin/service/${serviceRequest.id}/notes`}
              method="post"
              className="mt-4"
            >
              <textarea
                name="note"
                required
                maxLength={5000}
                rows={4}
                placeholder="Interne Notiz hinzufügen..."
                className="w-full rounded-xl border border-gray-300 p-3"
              />

              <button
                type="submit"
                className="mt-3 rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
              >
                Notiz speichern
              </button>
            </form>

            <div className="my-6 border-t" />

            {(notesResult.data ?? []).length === 0 ? (
              <p className="mt-4 text-gray-500">
                Noch keine internen Notizen.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {(notesResult.data ?? []).map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl bg-gray-50 p-4"
                  >
                    <p className="whitespace-pre-wrap">
                      {note.note}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {new Intl.DateTimeFormat('de-AT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Europe/Vienna',
                      }).format(new Date(note.created_at))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  )
}
