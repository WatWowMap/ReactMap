import { useSession } from '../session/useSession'

export function Profile() {
  const { status, data } = useSession()

  if (status === 'loading') {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-2 text-neutral-500">Loading...</p>
      </section>
    )
  }

  if (status === 'error' || !data?.user.loggedIn) {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-2 text-neutral-500">Sign in to see your profile.</p>
      </section>
    )
  }

  const { username, perms } = data.user

  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-2 text-lg">{username}</p>
      <ul className="mt-4 space-y-1 text-sm text-neutral-500">
        {Object.keys(perms).map((perm) => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-neutral-400">
        Account reset and linked accounts arrive in a later plan.
      </p>
    </section>
  )
}
