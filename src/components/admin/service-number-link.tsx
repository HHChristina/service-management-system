import Link from 'next/link'

export default function ServiceNumberLink({
  id,
  serviceNumber,
  selfRepairMarker = false,
}: {
  id: string
  serviceNumber: string
  selfRepairMarker?: boolean
}) {
  return (
    <Link
      href={`/admin/service/${id}`}
      title={
        selfRepairMarker
          ? 'Dieser Servicefall hatte Selbstreparatur durch den Kunden'
          : undefined
      }
      className={`font-semibold underline underline-offset-4 ${
        selfRepairMarker
          ? 'text-orange-700 decoration-orange-300 hover:decoration-orange-700'
          : 'decoration-gray-300 hover:decoration-black'
      }`}
    >
      {serviceNumber}
    </Link>
  )
}
