import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-neutral-500">
        This page does not exist.{' '}
        <Link className="underline" to="/">
          Go back home
        </Link>
      </p>
    </section>
  )
}
