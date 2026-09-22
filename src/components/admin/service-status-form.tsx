'use client'

import { FormEvent, useState } from 'react'

export default function ServiceStatusForm({
  serviceRequestId,
  currentStatus,
  hasFinalFault,
}: {
  serviceRequestId: string
  currentStatus: string
  hasFinalFault: boolean
}) {
  const [status, setStatus] =
    useState(currentStatus)

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    if (status !== 'completed') {
      return
    }

    if (!hasFinalFault) {
      event.preventDefault()

      window.alert(
        'Der Servicefall kann noch nicht abgeschlossen werden.\n\nBitte zuerst das Feld "Festgestellter Fehler" ausfüllen und speichern.'
      )

      return
    }

    const confirmed = window.confirm(
      'Bitte bestätigen:\n\nDer eingetragene "Festgestellte Fehler" ist das tatsächliche Ergebnis der Diagnose und der Servicefall soll jetzt abgeschlossen werden.'
    )

    if (!confirmed) {
      event.preventDefault()
    }
  }

  return (
    <form
      action={`/api/admin/service/${serviceRequestId}/status`}
      method="post"
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <select
        name="status"
        value={status}
        onChange={(event) =>
          setStatus(event.target.value)
        }
        className="rounded-lg border border-gray-300 bg-white px-4 py-2"
      >
        <option value="new">
          Neu
        </option>

        <option value="in_progress">
          In Bearbeitung
        </option>

        <option value="completed">
          Abgeschlossen
        </option>
      </select>

      <button
        type="submit"
        className="rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
      >
        Status speichern
      </button>
    </form>
  )
}
