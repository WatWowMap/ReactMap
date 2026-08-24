# Shell and IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 2.0 client a navigable shell: every route from the spec's IA, a mobile bottom nav, a hub at `/`, a working `/profile`, and a server-side per-user flag that decides which shell a request gets.

**Architecture:** `app/` gains a `react-router` tree where every route is its own lazy chunk. The shell bootstraps from `GET /api/settings`, the same endpoint 1.0 already uses, so nothing here depends on the WebSocket transport that session 3 designs. On the server, `clientRouter` learns a second route table and serves `app.html` to users whose row carries the 2.0 flag.

**Tech Stack:** React 19, react-router 8, Tailwind v4, TypeScript strict, `bun test` with Testing Library and happy-dom.

## Assumptions

Four calls made while writing this plan. Each is reversible, and each is called out because a reader could reasonably have expected the other choice.

1. **Router is `react-router` 8, not TanStack Router.** It is already a dependency at `^8.3.0` for 1.0, so this adds nothing to the tree. TanStack's typed params would suit a strict codebase, but the spec never asked for typed routes and there are only ten of them. Swapping later touches route definitions, not business logic.
2. **Component tests run on `bun test`, not Vitest.** The spec's §7 says "Vitest + Testing Library." That was written before the foundation plan moved everything to `bun:test`. Bun's runner is API-compatible for `describe`/`test`/`expect` and drives the DOM through happy-dom, so this honours the intent (Testing Library for components) without carrying two runners. If a Vitest-only feature is ever genuinely needed, revisit.
3. **The spec's "Deleted by this IA" list is NOT in scope here.** `/data-management`, Backups, the tutorial, the Poracle modal and `HookSelection.jsx` all live in `src/`, which is the shell most users are still served. Deleting them now degrades the running app for everyone who has not been flagged over. They go when 1.0 retires. The Backups removal additionally drops a database table and needs its own explicit sign-off before anyone writes that migration.
4. **`/profile` reads `GET /api/settings`.** That endpoint sits on `rootRouter` above the `secretMiddleware`-gated `/api/v1`, so a browser session can call it directly, and it already returns user, perms and map config. No new endpoint is needed for this plan.

## Global Constraints

- Every route is its own lazy chunk. The map route is the only one that may ever carry MapLibre or deck.gl.
- Mobile first. The bottom nav is the primary navigation; a wider viewport may add to it but must not require it.
- `app/` is strict TypeScript. `tsconfig.app.json` deliberately does not map `@components`, `@features` or `@store`; those aliases belong to 1.0 and must not resolve here.
- Nothing in `src/` or `server/src/` changes except `clientRouter.js` and the files Task 6 names.
- Prose in commits and PRs carries no em dashes, no bold, no inline bulleted headers, and never refers to the maintainer by name.
- The pre-commit hook runs `biome check` and `tsc -p tsconfig.app.json --noEmit` and blocks on either.
- `biome.json` rejects `//` comments and silently falls back to defaults if it fails to parse.

---

## File Structure

```
app/
  main.tsx                 existing entry, gains the router provider
  App.tsx                  existing, becomes the router tree
  routes.tsx               route table, every element lazy
  layout/
    Shell.tsx              persistent chrome: outlet + bottom nav
    BottomNav.tsx          Map / Filters / Alerts / Me
  session/
    types.ts               the shape of GET /api/settings that we rely on
    useSession.ts          fetch + cache the session payload
  pages/
    Hub.tsx                /
    MapPage.tsx            /map          placeholder until plan 4
    FiltersPage.tsx        /filters      placeholder until plan 5
    AlertsPage.tsx         /alerts       placeholder until plan 5
    Profile.tsx            /profile
    Locales.tsx            /locales      placeholder
    Playground.tsx         /playground   placeholder, admin gated
    NotFound.tsx           catch-all
server/src/routes/clientRouter.js   gains the 2.0 route table and shell selection
server/src/db/migrations/           one migration adding the flag column
```

---

## Task 1: Route table with lazy chunks

**Files:**
- Create: `app/routes.tsx`, `app/pages/Hub.tsx`, `app/pages/MapPage.tsx`, `app/pages/FiltersPage.tsx`, `app/pages/AlertsPage.tsx`, `app/pages/Profile.tsx`, `app/pages/Locales.tsx`, `app/pages/Playground.tsx`, `app/pages/NotFound.tsx`
- Modify: `app/App.tsx`, `app/main.tsx`
- Test: `app/routes.test.tsx`

**Interfaces:**
- Produces: `ROUTES`, an array consumed by Task 2's shell and asserted against by Task 6's server route table.

- [ ] **Step 1: Install the test dependencies**

```bash
bun add -d @testing-library/react @testing-library/dom happy-dom
```

- [ ] **Step 2: Write the failing test**

Create `app/routes.test.tsx`:

```tsx
import { expect, test } from 'bun:test'
import { ROUTES } from './routes'

test('every spec route is present exactly once', () => {
  const paths = ROUTES.map((route) => route.path).sort()
  expect(paths).toEqual(
    [
      '*',
      '/',
      '/alerts',
      '/filters',
      '/locales',
      '/map',
      '/playground',
      '/profile',
    ].sort(),
  )
})

test('every route element is lazy so it becomes its own chunk', () => {
  for (const route of ROUTES) {
    expect(typeof route.lazy).toBe('function')
  }
})
```

- [ ] **Step 3: Run it to verify it fails**

```bash
bun test app/routes.test.tsx
```

Expected: FAIL, `Cannot find module './routes'`.

- [ ] **Step 4: Write the route table**

Create `app/routes.tsx`:

```tsx
import type { RouteObject } from 'react-router'

/**
 * Every route is lazy so the bundler gives each one its own chunk. The map
 * route is the only one that will ever pull in MapLibre and deck.gl, and that
 * only holds if nothing here imports a page eagerly.
 */
export const ROUTES: RouteObject[] = [
  { path: '/', lazy: async () => ({ Component: (await import('./pages/Hub')).Hub }) },
  { path: '/map', lazy: async () => ({ Component: (await import('./pages/MapPage')).MapPage }) },
  { path: '/filters', lazy: async () => ({ Component: (await import('./pages/FiltersPage')).FiltersPage }) },
  { path: '/alerts', lazy: async () => ({ Component: (await import('./pages/AlertsPage')).AlertsPage }) },
  { path: '/profile', lazy: async () => ({ Component: (await import('./pages/Profile')).Profile }) },
  { path: '/locales', lazy: async () => ({ Component: (await import('./pages/Locales')).Locales }) },
  { path: '/playground', lazy: async () => ({ Component: (await import('./pages/Playground')).Playground }) },
  { path: '*', lazy: async () => ({ Component: (await import('./pages/NotFound')).NotFound }) },
]
```

- [ ] **Step 5: Write the placeholder pages**

Each page is a named export so the lazy imports above resolve. Create all eight with this shape, changing the name and copy:

```tsx
export function MapPage() {
  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold">Map</h1>
      <p className="mt-2 text-neutral-500">The map arrives in a later plan.</p>
    </section>
  )
}
```

`Hub.tsx` and `Profile.tsx` are replaced wholesale in Tasks 4 and 5, so keep them equally thin for now. `NotFound.tsx` says the page does not exist and links to `/`.

- [ ] **Step 6: Run the test to verify it passes**

```bash
bun test app/routes.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 7: Wire the router into the entry**

`app/App.tsx` becomes the router tree. `app/main.tsx` renders `<App />` as it already does, so only `App.tsx` changes:

```tsx
import { RouterProvider, createBrowserRouter } from 'react-router'
import { ROUTES } from './routes'

const router = createBrowserRouter(ROUTES)

export function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 8: Confirm the chunks actually split**

```bash
bun run build && ls dist/ | grep -cE '^(Hub|MapPage|FiltersPage)'
```

Expected: a non-zero count, and `dist/app.html` still present. If the pages landed in one chunk, the `manualChunks` rule in `vite.config.js` is capturing them; report that rather than working around it, because that rule is load-bearing for the 1.0 stylesheet split.

- [ ] **Step 9: Commit**

```bash
git add app/ package.json bun.lock
git commit -m "feat(app): add the 2.0 route table with lazy chunks"
```

---

## Task 2: Shell layout and bottom nav

**Files:**
- Create: `app/layout/Shell.tsx`, `app/layout/BottomNav.tsx`
- Modify: `app/routes.tsx`
- Test: `app/layout/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `ROUTES` from Task 1.
- Produces: `Shell`, wrapping every route as react-router's layout route.

- [ ] **Step 1: Configure the DOM test environment**

Create `bunfig.toml` at the repo root if it does not exist, or add to it:

```toml
[test]
preload = ["./app/test-setup.ts"]
```

Create `app/test-setup.ts`:

```ts
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
```

Install the registrator:

```bash
bun add -d @happy-dom/global-registrator
```

- [ ] **Step 2: Write the failing test**

Create `app/layout/BottomNav.test.tsx`:

```tsx
import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { BottomNav } from './BottomNav'

test('shows the four primary destinations in order', () => {
  render(
    <MemoryRouter initialEntries={['/map']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const labels = screen.getAllByRole('link').map((link) => link.textContent)
  expect(labels).toEqual(['Map', 'Filters', 'Alerts', 'Me'])
})

test('marks the active destination for assistive tech', () => {
  render(
    <MemoryRouter initialEntries={['/filters']}>
      <BottomNav />
    </MemoryRouter>,
  )
  const active = screen.getByRole('link', { name: 'Filters' })
  expect(active.getAttribute('aria-current')).toBe('page')
})
```

`toHaveAttribute` is a jest-dom matcher and is NOT available in `bun:test`; verified by running it, and it fails. Read the attribute directly instead, which needs no extra dependency. `NavLink` applies `aria-current="page"` itself when the route matches, confirmed in `react-router@8.3.0` at `dist/development/lib/dom/lib.js:372`, so there is nothing to pass explicitly.

- [ ] **Step 3: Run it to verify it fails**

```bash
bun test app/layout/BottomNav.test.tsx
```

Expected: FAIL, cannot find `./BottomNav`.

- [ ] **Step 4: Write the nav**

Create `app/layout/BottomNav.tsx`. Use `NavLink`, which sets `aria-current="page"` itself when the route matches:

```tsx
import { NavLink } from 'react-router'

const DESTINATIONS = [
  { to: '/map', label: 'Map' },
  { to: '/filters', label: 'Filters' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/profile', label: 'Me' },
] as const

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {DESTINATIONS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `py-3 text-center text-sm ${isActive ? 'text-violet-600' : 'text-neutral-500'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
bun test app/layout/BottomNav.test.tsx
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Write the shell and make it the layout route**

Create `app/layout/Shell.tsx`:

```tsx
import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'

export function Shell() {
  return (
    <div className="min-h-dvh bg-white font-sans">
      <main className="pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
```

In `app/routes.tsx`, wrap the existing array as the `children` of one layout route whose `Component` is `Shell`. Keep `ROUTES` exported with the same shape the Task 1 test asserts, and export the nested table separately as `ROUTER_ROUTES` for `createBrowserRouter`. Update `App.tsx` to use `ROUTER_ROUTES`.

- [ ] **Step 7: Run the full suite**

```bash
bun test
```

Expected: Task 1's route tests still pass unchanged, plus the two nav tests.

- [ ] **Step 8: Commit**

```bash
git add app/ bunfig.toml package.json bun.lock
git commit -m "feat(app): add the shell layout and mobile bottom nav"
```

---

## Task 3: Session bootstrap

**Files:**
- Create: `app/session/types.ts`, `app/session/useSession.ts`
- Test: `app/session/useSession.test.ts`

**Interfaces:**
- Produces: `useSession()` returning `{ status, data, error }`, consumed by Tasks 4 and 5.

- [ ] **Step 1: Write the types we actually rely on**

Create `app/session/types.ts`. Deliberately narrow: describe only the fields this plan reads, so a change elsewhere in the payload does not break the build.

```ts
export interface SessionUser {
  loggedIn: boolean
  username?: string
  perms: Record<string, unknown>
}

export interface SessionSettings {
  user: SessionUser
}
```

- [ ] **Step 2: Write the failing test**

Create `app/session/useSession.test.ts`:

```ts
import { afterEach, expect, mock, test } from 'bun:test'
import { fetchSession } from './useSession'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('returns the parsed payload on success', async () => {
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify({ user: { loggedIn: true, perms: {} } }), {
      status: 200,
    }),
  ) as typeof fetch
  const settings = await fetchSession()
  expect(settings.user.loggedIn).toBe(true)
})

test('throws with the status when the request fails', async () => {
  globalThis.fetch = mock(async () => new Response('nope', { status: 500 })) as typeof fetch
  expect(fetchSession()).rejects.toThrow('500')
})
```

- [ ] **Step 3: Run it to verify it fails**

```bash
bun test app/session/useSession.test.ts
```

Expected: FAIL, cannot find `./useSession`.

- [ ] **Step 4: Implement the fetch and the hook**

Create `app/session/useSession.ts` with `fetchSession()` doing a credentialed `GET /api/settings` and throwing `new Error(\`GET /api/settings failed: ${response.status}\`)` on a non-ok response, plus a `useSession()` hook holding `status`, `data` and `error` in state and calling `fetchSession` once on mount. Send `credentials: 'same-origin'` so the session cookie travels.

- [ ] **Step 5: Run the test to verify it passes**

```bash
bun test app/session/useSession.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add app/session/
git commit -m "feat(app): bootstrap the session from the settings endpoint"
```

---

## Task 4: The hub

**Files:**
- Modify: `app/pages/Hub.tsx`
- Test: `app/pages/Hub.test.tsx`

**Interfaces:**
- Consumes: nothing. The hub is always on for every operator and must render before the session resolves.

- [ ] **Step 1: Write the failing test**

Create `app/pages/Hub.test.tsx` asserting the hub links to `/map`, `/filters`, `/alerts` and `/profile`, and that it renders without a session (no fetch mocked at all). Use `MemoryRouter` as in Task 2.

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test app/pages/Hub.test.tsx
```

Expected: FAIL, the placeholder has no links.

- [ ] **Step 3: Write the hub**

Navigation to the other surfaces, nothing else. The spec is explicit that this is a hub and not a marketing page, and that the news feed is a later phase. Do not add a feed, a hero, or copy about the project.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/
git commit -m "feat(app): build the hub at the root route"
```

---

## Task 5: Profile

**Files:**
- Modify: `app/pages/Profile.tsx`
- Test: `app/pages/Profile.test.tsx`

**Interfaces:**
- Consumes: `useSession()` from Task 3.

- [ ] **Step 1: Write the failing test**

Create `app/pages/Profile.test.tsx` covering three states, since all three are reachable and only one is the happy path:

1. session still loading renders a loading affordance,
2. logged out renders a prompt to sign in and does not render account details,
3. logged in renders the username.

Mock `globalThis.fetch` per case exactly as Task 3 does, and restore it in `afterEach`.

- [ ] **Step 2: Run it to verify it fails**

Expected: FAIL, the placeholder renders none of these.

- [ ] **Step 3: Write the page**

Render the three states. Show username and the permission list from the session payload. Do not build the reset action or linked-accounts management in this plan; both need endpoints that do not exist yet, and inventing them here would commit the transport design that session 3 owns. Leave a clearly labelled section noting they arrive later.

- [ ] **Step 4: Run the test to verify it passes**

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/pages/
git commit -m "feat(app): render the profile page from the session payload"
```

---

## Task 6: Server-side shell selection

**Files:**
- Modify: `server/src/routes/clientRouter.js`
- Create: one migration under `server/src/db/migrations/`
- Test: `server/test/clientRouter.test.js`

**Interfaces:**
- Consumes: the route paths from Task 1.

- [ ] **Step 1: Find the migration convention**

```bash
ls server/src/db/migrations/ | tail -5
```

Read the most recent one and match its filename format and export shape exactly. Do not invent a format.

- [ ] **Step 2: Write the failing test**

Create `server/test/clientRouter.test.js` asserting that the module exports a helper which, given a request-like object, returns `app.html` when the user carries the 2.0 flag and `index.html` when they do not or when there is no user at all. Export that helper from `clientRouter.js` so it can be tested without booting Express; requiring the whole server would start the database singleton and kill the test runner.

- [ ] **Step 3: Run it to verify it fails**

```bash
bun test server/test/clientRouter.test.js
```

Expected: FAIL, the helper is not exported.

- [ ] **Step 4: Add the migration**

One column on the users table, defaulting to false so every existing row keeps 1.0. Name it for what it does rather than for a version number, so it reads sensibly after 2.0 stops being new.

- [ ] **Step 5: Implement selection**

Add the 2.0 paths from Task 1 to the router's route list, keeping every existing 1.0 path so current deep links keep working. Note that `/` means the map in 1.0 and the hub in 2.0; both shells claim the same path and the flag is what disambiguates. Serve `app.html` or `index.html` from the same `dist` directory logic already there, including the `NODE_CONFIG_ENV` suffix.

- [ ] **Step 6: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 7: Run everything**

```bash
bun test && bun run typecheck && bun run lint && bun run build
```

Expected: all clean. Confirm `dist/index.html` and `dist/app.html` both exist and still reference different stylesheets, with `@layer base` absent from the 1.0 one. That invariant was won in the foundation plan and this task touches the same build.

- [ ] **Step 8: Commit**

```bash
git add server/ && git commit -m "feat(server): serve the 2.0 shell to flagged users"
```

---

## Done criteria

```bash
bun test
bun run typecheck
bun run lint
bun run build
```

All four succeed. Then:

- `dist/app.html` exists and each page from Task 1 is its own chunk in `dist/`.
- `dist/index.html` still loads a stylesheet containing no `@layer base`.
- A user row without the flag is served `index.html`; a row with it is served `app.html`.
- Visiting `/map`, `/filters`, `/alerts` and `/profile` in the 2.0 shell renders each page with the bottom nav present.

## What this plan does not do

- No map, no filters UI, no alerts UI. Those routes render placeholders.
- No shadcn and no design tokens. Plan 3 owns the design system; the styling here is plain Tailwind and is expected to be replaced.
- Nothing in the spec's "Deleted by this IA" list is deleted. See assumption 3.
- No Playwright. Three of the spec's four flows need features later plans build; the cold-load flow is worth adding once there is something to load.
- No profile reset action and no linked-account management, per Task 5.
