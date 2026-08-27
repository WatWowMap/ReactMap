import { SignInButtons, SignOutButton } from '../session/sign-in-buttons'
import { useSession } from '../session/use-session'

export function Profile() {
  const { status, data } = useSession()

  if (status === 'loading') {
    return (
      <section className="p-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Profile
        </h1>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </section>
    )
  }

  if (status === 'error' || !data?.user.loggedIn) {
    return (
      <section className="p-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Profile
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to see your profile.
        </p>
        <SignInButtons methods={data?.authentication?.methods ?? []} />
      </section>
    )
  }

  const { username, perms } = data.user

  return (
    <section className="p-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Profile
      </h1>
      <p className="mt-2 text-lg font-medium text-foreground">{username}</p>
      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
        {Object.keys(perms).map((perm) => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        Account reset and linked accounts arrive in a later plan.
      </p>
      <SignOutButton />
    </section>
  )
}
