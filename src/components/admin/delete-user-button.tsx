'use client'

export default function DeleteUserButton({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  return (
    <form
      action={`/api/admin/users/${userId}/delete`}
      method="post"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Benutzer "${userName}" wirklich dauerhaft löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
        )

        if (!confirmed) {
          event.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
      >
        Löschen
      </button>
    </form>
  )
}
