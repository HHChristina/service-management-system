'use client'

import { FormEvent, useState } from 'react'

type ProductGroup = {
  id: string
  name: string
  code: string
}

export default function ServiceForm({
  productGroups,
}: {
  productGroups: ProductGroup[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceNumber, setServiceNumber] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setError(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = Object.fromEntries(formData.entries())

    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      setError(
        result.error ??
          'Der Servicefall konnte nicht gespeichert werden.'
      )
      setLoading(false)
      return
    }

    setServiceNumber(result.serviceNumber)
    form.reset()
    setLoading(false)
  }

  if (serviceNumber) {
    return (
      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-xl font-bold text-green-900">
          Servicefall erfolgreich übermittelt
        </h2>

        <p className="mt-3 text-green-900">
          Ihre Servicenummer lautet:
        </p>

        <p className="mt-2 text-2xl font-bold text-green-950">
          {serviceNumber}
        </p>

        <button
          type="button"
          onClick={() => setServiceNumber(null)}
          className="mt-6 rounded-lg bg-black px-5 py-3 font-semibold text-white"
        >
          Weiteren Servicefall melden
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="mb-2 block font-medium">
          Firma / Kunde *
        </label>

        <input
          name="customer_name"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Anrede
        </label>

        <select
          name="salutation"
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        >
          <option value="">Bitte auswählen</option>
          <option value="Herr">Herr</option>
          <option value="Frau">Frau</option>
          <option value="Divers">Divers</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Vorname *
          </label>

          <input
            name="first_name"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Nachname *
          </label>

          <input
            name="last_name"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          E-Mail-Adresse *
        </label>

        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Telefonnummer
        </label>

        <input
          name="phone"
          type="tel"
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Adresse
        </label>

        <input
          name="street_address"
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            PLZ
          </label>

          <input
            name="postal_code"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Ort
          </label>

          <input
            name="city"
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Land
        </label>

        <input
          name="country"
          defaultValue="Austria"
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Produktgruppe *
        </label>

        <select
          name="product_group_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        >
          <option value="" disabled>
            Bitte Produktgruppe auswählen
          </option>

          {productGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Seriennummer (SN) *
        </label>

        <input
          name="serial_number"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          Problembeschreibung *
        </label>

        <textarea
          name="problem_description"
          required
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? 'Servicefall wird erstellt...'
          : 'Servicefall senden'}
      </button>
    </form>
  )
}
