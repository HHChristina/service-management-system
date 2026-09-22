export default function StatusBadge({
  status,
}: {
  status: string
}) {
  const styles: Record<string, string> = {
    new: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  }

  const labels: Record<string, string> = {
    new: 'Neu',
    in_progress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}
