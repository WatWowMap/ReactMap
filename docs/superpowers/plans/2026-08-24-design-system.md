# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 2.0 client the design language the spec calls for: the fonts actually loading, a complete light and dark token set, a separate and deliberately unharmonised data palette, shadcn wired up, and the existing shell restyled so the language is visible rather than theoretical.

**Architecture:** Tokens live in `app/styles.css` as CSS variables on `:root`, with a dark override. The data palette is a separate file that never references the accent, so nobody later "tidies" team colours into the brand. shadcn components are copied into `app/components/ui/`, source we own. The shell built in plan 2 is restyled to consume the tokens, which is what proves the system works end to end.

**Tech Stack:** Tailwind v4, shadcn, Radix primitives, lucide-react, self-hosted Fredoka and Nunito.

## Assumptions

Four calls made while writing this plan. Each is stated because a reader could reasonably expect the other choice.

1. **MUI stays.** The spec's dependency delta says `@mui/material`, `@mui/icons-material`, `@mui/lab`, `@emotion/react` and `@emotion/styled` go. **204 files in `src/` import MUI**, and `src/` is the shell essentially every real user is served. That delta describes the end state, the same way the "deleted by this IA" list did in plan 2. MUI leaves when 1.0 retires. Nothing in this plan touches `src/`.
2. **Fonts are self-hosted, not linked from Google.** `@fontsource-variable/fredoka` and `@fontsource-variable/nunito`, both verified at 5.3.0. 1.0 links Roboto from Google Fonts, which is not a reason to add a second external request: self-hosting works offline, survives an operator behind a restrictive network, and sends nothing about their users to a third party. Variable fonts also mean one file per family rather than one per weight.
3. **Only the shadcn components this plan actually uses get installed.** The spec lists fifteen that 2.0 will eventually need. Installing all of them now produces fifteen unused files that drift before anything imports them. They arrive when the features that need them do, in plans 4 and 5.
4. **No motion yet.** The spec wants springy motion and a sparkle on a hundo. There is nothing to animate: the shell renders placeholders. `motion` arrives with the first thing worth animating rather than as an unused dependency.

## Global Constraints

- Nothing in `src/` or `server/` changes. This plan is entirely `app/` plus dependency manifests.
- Light and dark come from ONE CSS-variable set on `:root` with a dark override, not two parallel systems.
- The data palette is a separate file and never derives any value from the accent tokens.
- Numeric UI uses `tabular-nums`.
- `app/` is strict TypeScript. `tsconfig.app.json` does not map `@components`, `@features` or `@store`; those belong to 1.0 and must not resolve here.
- Component tests clean up after each test and scope queries to their own render container. Two renders sharing an accessible name otherwise make `getByRole` ambiguous, which is a real failure this project has already shipped to CI once.
- Do not add a `preload` to `bunfig.toml`. It is process-wide and previously broke three Node-side suites. Import `setupDom`/`teardownDom` from `app/test-setup.ts` in a file-local `beforeAll`/`afterAll`.
- Prose in commits carries no em dashes, no bold, no inline bulleted headers, and never refers to the maintainer by name.
- The pre-commit hook runs `biome check` and `tsc -p tsconfig.app.json --noEmit` and blocks on either.
- `biome.json` rejects `//` comments and silently falls back to defaults if it fails to parse.

---

## File Structure

```
app/
  styles.css              tokens: fonts, light and dark, radii, accent
  tokens/
    data-palette.css      team, league and IV colours; imports nothing, derives nothing
  components/
    ui/                   shadcn components, copied in, source we own
  layout/
    BottomNav.tsx         restyled onto tokens
  pages/
    Hub.tsx               restyled onto tokens
    Profile.tsx           restyled onto tokens
components.json           shadcn config
```

---

## Task 1: Make the fonts actually load

**Files:**
- Modify: `app/styles.css`, `app/main.tsx`, `package.json`
- Test: `app/styles.test.ts`

The tokens already name Fredoka and Nunito. Nothing loads them, so both silently fall back to `ui-sans-serif` and the whole characterful direction renders as system UI. This is the first task because every later visual judgement is wrong until it is fixed.

- [ ] **Step 1: Write the failing test**

Create `app/styles.test.ts`. Assert that the font families named in the `@theme` block are actually imported somewhere in `app/`, by reading both files rather than trusting a rendered result:

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p: string) => readFileSync(join(import.meta.dir, p), 'utf8')

test('every font family the tokens name is actually loaded', () => {
  const tokens = read('styles.css')
  const entry = read('main.tsx')
  const families = [...tokens.matchAll(/--font-[\w-]+:\s*'([^']+)'/g)].map(
    (match) => match[1],
  )
  expect(families.length).toBeGreaterThan(0)
  for (const family of families) {
    const slug = family.toLowerCase()
    expect(`${tokens}${entry}`).toContain(`fontsource-variable/${slug}`)
  }
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test app/styles.test.ts
```

Expected: FAIL. Nothing imports either font.

- [ ] **Step 3: Install the fonts**

```bash
bun add @fontsource-variable/fredoka @fontsource-variable/nunito
```

Both verified to exist at 5.3.0. Note `[install] exact = true` in `bunfig.toml`, so these pin exactly. That is the project's existing behaviour; do not add carets.

- [ ] **Step 4: Import them**

Add both imports at the top of `app/main.tsx`, above the stylesheet import so the faces are registered before the tokens that reference them are applied.

- [ ] **Step 5: Run the test to verify it passes**

Expected: PASS.

- [ ] **Step 6: Confirm the faces reach the bundle**

```bash
bun run build && ls dist/ | grep -ciE 'fredoka|nunito'
```

Expected: a non-zero count of emitted font files. If it is zero the import is being tree-shaken or the asset is inlined; report which rather than working around it.

- [ ] **Step 7: Commit**

```bash
git add app/ package.json bun.lock
git commit -m "feat(app): load the display and body fonts"
```

---

## Task 2: Complete the token set, and keep the data palette away from it

**Files:**
- Modify: `app/styles.css`
- Create: `app/tokens/data-palette.css`
- Test: `app/tokens/data-palette.test.ts`

**Interfaces:**
- Produces: the CSS variables every later component consumes.

- [ ] **Step 1: Write the failing test**

Create `app/tokens/data-palette.test.ts`. The property worth pinning is the separation, because it is the one a future tidy-up breaks:

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const palette = readFileSync(join(import.meta.dir, 'data-palette.css'), 'utf8')

test('the data palette derives nothing from the brand accent', () => {
  expect(palette).not.toContain('--color-accent')
  expect(palette).not.toContain('color-mix')
})

test('the data palette defines the groups the map depends on', () => {
  for (const group of ['team', 'league', 'iv']) {
    expect(palette).toContain(`--color-${group}-`)
  }
})
```

- [ ] **Step 2: Run it to verify it fails**

Expected: FAIL, the file does not exist.

- [ ] **Step 3: Write the data palette**

Create `app/tokens/data-palette.css` with the team, league and IV tier colours as literal values. Put a comment at the top saying why the file exists: these are a language on the map surface, they mean specific things to players, and harmonising them with the brand would make the map lie. Do not import anything into this file.

Take the actual colour values from 1.0 rather than inventing them, so the map keeps meaning what it means. Look in `src/assets/` and `src/components/` for the existing team and league colours and carry them across. Say in your report where you sourced them.

- [ ] **Step 4: Extend the main token set**

In `app/styles.css`, add to the existing `@theme` block and a `:root` set: surface, foreground, muted, border and ring colours, plus the accent pair already present. Then add a dark override driven by one mechanism, either `prefers-color-scheme` or a `data-theme` attribute, and say which you chose and why. Do not build both.

Import the data palette from `app/styles.css` so it ships, but keep it a separate file.

- [ ] **Step 5: Run the tests to verify they pass**

Expected: PASS, both.

- [ ] **Step 6: Confirm dark mode actually changes something**

```bash
bun run build && grep -c 'prefers-color-scheme\|data-theme' dist/app-*.css
```

Expected: non-zero. A token set with a dark block that gets stripped is worse than none, because it looks done.

- [ ] **Step 7: Commit**

```bash
git add app/ && git commit -m "feat(app): complete the token set and separate the data palette"
```

---

## Task 3: Wire up shadcn and lucide

**Files:**
- Create: `components.json`, `app/components/ui/*`
- Modify: `package.json`, `tsconfig.app.json` if an alias is needed
- Test: `app/components/ui/ui.test.tsx`

- [ ] **Step 1: Initialise shadcn**

```bash
bunx shadcn@latest init
```

This project is plain Vite with Tailwind v4, not Next. Answer accordingly. It will want a path alias for components; `tsconfig.app.json` currently maps only `@app/*`, so either reuse that or add one, and make sure whatever you add resolves under `bun run typecheck`.

If init wants to modify `app/styles.css`, let it, then re-run task 2's tests and confirm the token set and the data palette import survived. Report anything it changed that you had to put back.

- [ ] **Step 2: Add only what this plan uses**

```bash
bunx shadcn@latest add button card
bun add lucide-react
```

`lucide-react` verified at 1.33.0. Do not add the other thirteen components the spec eventually wants; they arrive with the features that need them.

- [ ] **Step 3: Write a test that the components render and consume tokens**

Create `app/components/ui/ui.test.tsx`. Render a `Button` and a `Card`, assert each appears, and assert the button carries a class referencing a token rather than a hardcoded colour. Follow `app/layout/BottomNav.test.tsx` exactly for the DOM setup: `setupDom`/`teardownDom` in a file-local `beforeAll`/`afterAll`, `afterEach(cleanup)`, and queries scoped with `within(container)`.

- [ ] **Step 4: Run everything**

```bash
bun test && bun run typecheck && bun run lint && bun run build
```

Expected: all clean. shadcn components are third-party source copied into the tree, so if biome objects to something in them, prefer a scoped ignore over rewriting vendored code, and say what you ignored.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(app): wire up shadcn and lucide"
```

---

## Task 4: Restyle the shell onto the design language

**Files:**
- Modify: `app/layout/BottomNav.tsx`, `app/pages/Hub.tsx`, `app/pages/Profile.tsx`
- Test: the existing tests for each

This is what proves the system. Until something consumes the tokens they are a file nobody reads.

- [ ] **Step 1: Restyle the bottom nav**

Replace the plain Tailwind colours with tokens. Add a lucide icon per destination above each label. Keep the accessible names exactly as they are: the existing tests assert the four labels and the `aria-current` behaviour, and those assertions are the contract, not an obstacle.

The nav is fixed to the viewport bottom and already handles `pb-[env(safe-area-inset-bottom)]`. Keep that.

- [ ] **Step 2: Run the nav tests**

```bash
bun test app/layout/BottomNav.test.tsx
```

Expected: PASS, unchanged. If an assertion breaks, the restyle changed the accessible name, which is a regression in what assistive technology announces, not a test that needs updating.

- [ ] **Step 3: Restyle the hub**

Use `Card` for the destination tiles, display font for the heading, an icon per tile. The hub still renders without a session, so do not introduce one.

- [ ] **Step 4: Restyle profile**

Tokens for the three states. Numeric values, if any appear, get `tabular-nums`.

- [ ] **Step 5: Run everything**

```bash
bun test && bun run typecheck && bun run lint && bun run build
```

Expected: all clean, and every pre-existing test still passing without modification.

- [ ] **Step 6: Confirm the two entries are still separate**

```bash
grep -o '/index-[^"]*\.css\|/app-[^"]*\.css' dist/index.html dist/app.html
```

Expected: different stylesheets for the two entries, with `@layer base` absent from the 1.0 one. That invariant was won in plan 1 and this plan changes the CSS the 2.0 entry pulls in.

- [ ] **Step 7: Commit**

```bash
git add app/ && git commit -m "feat(app): restyle the shell onto the design tokens"
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

- Font files for both families are emitted into `dist/`.
- `dist/app-*.css` contains a dark-mode mechanism.
- `app/tokens/data-palette.css` references no accent token.
- `dist/index.html` and `dist/app.html` still load different stylesheets, `@layer base` absent from the 1.0 one.
- Every test that existed before this plan still passes without being edited.

## What this plan does not do

- No MUI removal. `src/` keeps all 204 of its MUI imports until 1.0 retires.
- No map, filters or alerts UI. Those routes still render placeholders.
- No motion library and no animation.
- No virtualised selector grid and no filter sentence editor. Both are listed in the spec as components we own, and both belong to the plans that build the features around them.
- Only two shadcn components. The other thirteen arrive with their features.
