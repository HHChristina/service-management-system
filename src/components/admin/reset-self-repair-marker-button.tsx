'use client'

export default function ResetSelfRepairMarkerButton({
  serviceRequestId,
}: {
  serviceRequestId: string
}) {
  return (
    <form
      action={`/api/admin/service/${serviceRequestId}/self-repair-marker/reset`}
      method="post"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          'Orange Selbstreparatur-Markierung wirklich entfernen?\n\nDie Statushistorie bleibt erhalten. Diese Funktion ist nur für eine versehentlich gesetzte Markierung gedacht.'
        )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
      >
        Orange-Markierung entfernen
      </button>
    </form>
  )
}
