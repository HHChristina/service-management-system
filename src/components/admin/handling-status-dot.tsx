export default function HandlingStatusDot({
  status,
}: {
  status?: string | null
}) {
  const title =
    status === 'warranty'
      ? 'Garantie'
      : status === 'customer_fault'
        ? 'Verschleißteil / Kunde ist schuld'
        : status === 'out_of_warranty'
          ? 'Gerät nicht mehr in Garantie'
          : 'Abwicklungsstatus noch nicht festgelegt'

  const style =
    status === 'warranty'
      ? 'border-green-600 bg-green-500'
      : status === 'customer_fault' ||
          status === 'out_of_warranty'
        ? 'border-red-600 bg-red-500'
        : 'border-gray-700 bg-transparent'

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 ${style}`}
    />
  )
}
