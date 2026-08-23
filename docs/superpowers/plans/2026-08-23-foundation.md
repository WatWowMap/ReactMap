# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ReactMap's toolchain — Node/Yarn/ESLint/Prettier/jsconfig — with Bun, Biome, and a strict TypeScript setup, and stand up an empty second Vite entry so the 2.0 client can be built alongside 1.0.

**Architecture:** Nothing in `src/` (the 1.0 client) or `server/src/` changes behaviourally. This is a toolchain swap plus a scaffold. The one exception is two dependency removals that Bun makes redundant — `bcrypt` and `node-fetch` — each of which is a small, tested behaviour change. At the end, `bun run build` produces two bundles from one config, and `app/` exists but renders a placeholder.

**Tech Stack:** Bun (runtime, package manager, test runner), Biome (lint + format), TypeScript 5.5 strict, Tailwind CSS v4, Vite 6, React 19.

## Global Constraints

- **Target branch is `v2`.** Every commit in this plan lands on `v2`. Never commit to `main`.
- **TDD throughout.** Write the failing test, watch it fail, implement, watch it pass, commit. No exceptions, including for config changes — where a "test" is a command whose output you assert on.
- **Conventional Commits.** `type(scope): summary`. `commitlint` enforces this on `commit-msg`.
- **The first behavioural commit must carry `feat!:` or a `BREAKING CHANGE:` footer**, or semantic-release will compute `1.51.0-v2.1` instead of `2.0.0-v2.1`. Task 3 is designated for this.
- **Do not modify** anything under `src/`, `server/src/`, or `packages/` except the exact files named in a task. In particular, do not "helpfully" convert other files to TypeScript — that is a later plan.
- **Node version floor** in `package.json` `engines` is currently `>=22.22.0`. Bun replaces it; do not leave both.
- **Existing behaviour is the specification.** 53 backend tests exist. They must all still pass at every commit.

---

## File Structure

**Created:**

- `bunfig.toml` — Bun config: test root, preload.
- `biome.json` — lint + format rules, replacing `.eslintrc` and `.prettierrc`.
- `tsconfig.json` — strict, replacing `jsconfig.json`.
- `tsconfig.app.json` — client-specific, extends the root, covers `app/`.
- `app.html` — second Vite entry.
- `app/main.tsx` — 2.0 client entry point.
- `app/App.tsx` — placeholder root component.
- `app/styles.css` — Tailwind v4 entry.

**Modified:**

- `package.json` — scripts, engines, dependencies, lint-staged.
- `vite.config.js` — second entry, Tailwind plugin, drop `customFilePlugin`.
- `.github/workflows/lint.yml` — Bun instead of Node/Yarn.
- `.github/workflows/main.yml` — add `v2` to the push trigger.
- `.husky/pre-commit` — Biome instead of lint-staged.
- `Dockerfile` — Bun base image.
- `server/src/services/LocalClient.js` — `bcrypt` → `Bun.password`.
- 8 files importing `node-fetch` → native `fetch`.
- 7 test files — `node:test` → `bun:test`.

**Deleted:**

- `.eslintrc`, `.eslintignore`, `.prettierrc`, `.prettierignore`, `jsconfig.json`, `yarn.lock`
- `packages/vite-plugins/lib/customFile.js`

---

## Task 1: Bun as package manager and runtime

**Files:**

- Create: `bunfig.toml`
- Modify: `package.json`, `Dockerfile`, `.github/workflows/lint.yml`, `.github/workflows/main.yml`
- Delete: `yarn.lock`

**Interfaces:**

- Consumes: nothing.
- Produces: `bun install` works; `bun run <script>` replaces `yarn <script>`; CI runs on Bun. Later tasks assume `bun` is the only package manager and that `bun test` is available.

- [ ] **Step 1: Record the current test baseline**

Before changing anything, capture what must keep passing.

```bash
yarn test 2>&1 | tail -20
```

Expected: the masterfile package tests pass, then `server/test/*.test.js` reports its pass count. **Write that number down** — every later step must match it. At time of writing it is 53 across 7 files.

- [ ] **Step 2: Install Bun and record the version**

```bash
curl -fsSL https://bun.sh/install | bash
bun --version
```

Use the exact version printed here everywhere a version is pinned below. Do not invent a version number.

- [ ] **Step 3: Generate the Bun lockfile**

```bash
rm -f yarn.lock
bun install
```

Expected: `bun.lock` is created. If any package fails to install, **STOP and report** — do not hand-patch `node_modules`.

- [ ] **Step 4: Verify the existing tests still pass under Bun's Node compatibility**

```bash
bun run node --experimental-test-module-mocks --test server/test/*.test.js 2>&1 | tail -20
```

Expected: same pass count as Step 1. This runs the Node test runner under Bun's process manager — it proves dependency resolution survived the package manager swap, before Task 2 changes the test runner itself.

If this fails on a native module, the failure will name it. The only native dependency in the tree is `bcrypt`; if that is what fails, note it and continue — Task 3 removes it. Any other native failure: **STOP and report**.

- [ ] **Step 5: Create `bunfig.toml`**

```toml
[install]
exact = true

[test]
root = "."
coverage = false
```

- [ ] **Step 6: Update `package.json` — engines and scripts**

Replace the `engines` block:

```json
  "engines": {
    "bun": ">=1.2.0"
  },
```

In `scripts`, replace every `yarn workspace` invocation with `bun run --filter`, and `node` with `bun`:

```json
    "config:check": "bun run --filter @rm/config check",
    "config:env": "bun run --filter @rm/config generate",
    "dev": "NODE_ENV=development bun --watch server/src/index.js",
    "locales:create": "bun run --filter @rm/locales create",
    "locales:generate": "bun run --filter @rm/locales generate",
    "locales:missing": "bun run --filter @rm/locales missing",
    "masterfile": "bun run --filter @rm/masterfile generate",
    "server": "bun server/src/index.js",
    "start": "bun .",
```

Leave `test` alone for now — Task 2 changes it.

- [ ] **Step 7: Verify scripts resolve**

```bash
bun run masterfile 2>&1 | tail -5
```

Expected: the masterfile generates without error, writing `packages/masterfile/lib/data/masterfile.json`.

- [ ] **Step 8: Update the Dockerfile**

Replace the whole file:

```dockerfile
## Simple Dockerfile to build ReactMap (v2 branch)
# - Inside the container, the content of this git repo lives in /home/node/
## You have to mount your configs into the container:
# - mount local.json to /home/node/server/src/configs/local.json
# - mount areas.json to /home/node/server/src/configs/areas.json

FROM oven/bun:1-alpine

WORKDIR /home/node

RUN apk add --no-cache git

COPY package.json bun.lock ./
COPY packages ./packages
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

CMD ["bun", "."]
```

Note this adds a `CMD`, which the previous Dockerfile lacked entirely.

- [ ] **Step 9: Update CI to use Bun**

In `.github/workflows/lint.yml`, replace the Node setup and install steps:

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: 1.2.0

- name: Install Dependencies
  run: bun install --frozen-lockfile

- name: Masterfile
  run: bun run masterfile

- name: Test
  run: bun run test

- name: Lint
  run: bun run lint

- name: Build
  run: bun run build
```

Set `bun-version` to the version from Step 2. Note the `Prettier` step is **removed** — Task 5 folds formatting into `bun run lint`.

- [ ] **Step 10: Add `v2` to the CI push trigger**

In `.github/workflows/main.yml`:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - v2
```

- [ ] **Step 11: Full verification**

```bash
bun install --frozen-lockfile && bun run masterfile && bun run build 2>&1 | tail -10
```

Expected: build completes, `dist/` is written.

- [ ] **Step 12: Commit**

```bash
git add bunfig.toml bun.lock package.json Dockerfile .github/workflows/lint.yml .github/workflows/main.yml
git rm --cached yarn.lock 2>/dev/null; rm -f yarn.lock
git add -u
git commit -m "chore: replace yarn and node with bun

Bun becomes the package manager, runtime and script runner. CI and the
Dockerfile follow. The Prettier CI step is removed here and folded into
lint in a later commit.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Migrate tests from `node:test` to `bun:test`

**Files:**

- Modify: `server/test/stateMock.js`, `server/test/geocoder.test.js`, `server/test/pokemonData.test.js`, `server/test/rocketPokemonFiltering.test.js`, `server/test/showcaseEndpointAvailability.test.js`, `server/test/showcaseEndpointRouting.test.js`, `server/test/showcaseFocus.test.js`, `packages/masterfile/test/index.test.js`
- Modify: `package.json` (the `test` script)

**Interfaces:**

- Consumes: Bun from Task 1.
- Produces: `bun test` is the test command. Every later task's verification step uses it. `node:assert/strict` remains the assertion library — Bun implements it fully, so assertions do not change.

The migration has exactly three mechanical shapes. Everything else in these files stays byte-identical.

| `node:test`                                  | `bun:test`                                 |
| -------------------------------------------- | ------------------------------------------ |
| `require('node:test')`                       | `require('bun:test')`                      |
| `t.mock.method(obj, 'm', impl)`              | `spyOn(obj, 'm').mockImplementation(impl)` |
| `mock.module(path, { namedExports: {...} })` | `mock.module(path, () => ({...}))`         |

`node:test` auto-restores mocks after each test; `bun:test` does not, so an `afterEach(() => mock.restore())` is required in any file that mocks.

- [ ] **Step 1: Convert the simplest file first and watch it pass**

`server/test/geocoder.test.js` has no mocking — it is the control case. Change only line 2:

```js
const { test } = require('bun:test')
```

- [ ] **Step 2: Run it**

```bash
bun test server/test/geocoder.test.js
```

Expected: PASS, 22 tests. If assertions fail, `node:assert/strict` is behaving differently under Bun — **STOP and report** rather than rewriting assertions.

- [ ] **Step 3: Convert `stateMock.js`, the shared module mock**

Line 1 and the `mock.module` call change shape. Current:

```js
const { mock } = require('node:test')
// ...
mock.module(require.resolve('../src/services/state'), {
  namedExports: { state: mockState },
})
```

Becomes:

```js
const { mock } = require('bun:test')
// ...
mock.module(require.resolve('../src/services/state'), () => ({
  state: mockState,
}))
```

Bun's `mock.module` takes a factory returning the module object directly; there is no `namedExports` wrapper.

- [ ] **Step 4: Convert the four files that use `t.mock.method`**

For each of `pokemonData.test.js`, `showcaseEndpointAvailability.test.js`, `showcaseEndpointRouting.test.js`, and `packages/masterfile/test/index.test.js`:

Change the import to include `spyOn`, `afterEach` and `mock`:

```js
const { test, afterEach, mock, spyOn } = require('bun:test')
```

Add a restore hook near the top of the file, after the imports:

```js
afterEach(() => {
  mock.restore()
})
```

Then rewrite each mock call. The test callback's `t` / `context` parameter becomes unused — remove it from the signature:

```js
// before
test('refreshes on demand', async (t) => {
  t.mock.method(Ohbem, 'fetchPokemonData', async () => snapshots[fetches++])

// after
test('refreshes on demand', async () => {
  spyOn(Ohbem, 'fetchPokemonData').mockImplementation(async () => snapshots[fetches++])
```

Apply the same transform to every `t.mock.method(` and `context.mock.method(` occurrence. There are 9 across these four files.

- [ ] **Step 5: Convert the two remaining files**

`rocketPokemonFiltering.test.js` and `showcaseFocus.test.js` use only `test`, `before`, `after`. Change the import line only:

```js
const { after, before, test } = require('bun:test')
```

- [ ] **Step 6: Update the `test` script**

In `package.json`:

```json
    "test": "bun test",
```

`bunfig.toml`'s `root = "."` makes Bun discover both `server/test/` and `packages/masterfile/test/`, so the two-part `&&` chain is no longer needed.

- [ ] **Step 7: Run the whole suite**

```bash
bun test 2>&1 | tail -20
```

Expected: the same pass count recorded in Task 1 Step 1. **If the count is lower, tests are being skipped, not passing** — check that Bun discovered both test directories before assuming success.

- [ ] **Step 8: Commit**

```bash
git add server/test packages/masterfile/test package.json
git commit -m "test: migrate from node:test to bun:test

Import swap plus two API differences: t.mock.method becomes spyOn().
mockImplementation(), and mock.module takes a factory rather than a
namedExports object. node:test auto-restores mocks between tests and
bun:test does not, so files that mock now restore explicitly in afterEach.

Assertions are unchanged - node:assert/strict works as-is under Bun.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Replace `bcrypt` with `Bun.password`

**Files:**

- Modify: `server/src/services/LocalClient.js:4`, `:66`, `:84`
- Create: `server/test/localPassword.test.js`
- Modify: `package.json` (remove the `bcrypt` dependency)

**Interfaces:**

- Consumes: `bun test` from Task 2.
- Produces: no exported interface change. `LocalClient` behaves identically; the native `bcrypt` dependency is gone.

`Bun.password` produces and verifies `$2b$` bcrypt hashes, which is the same format `bcrypt@5` writes — so **existing user password hashes in the database keep working**. This task carries the `feat!:` marker that starts the 2.0 prerelease line.

- [ ] **Step 1: Write the failing test**

Create `server/test/localPassword.test.js`:

```js
const assert = require('node:assert/strict')
const { test } = require('bun:test')

const { hashPassword, verifyPassword } = require('../src/services/LocalClient')

test('hashes a password into bcrypt format', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.match(hash, /^\$2[aby]\$/)
})

test('verifies a password it just hashed', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.equal(await verifyPassword('correct horse battery staple', hash), true)
})

test('rejects a wrong password', async () => {
  const hash = await hashPassword('correct horse battery staple')
  assert.equal(await verifyPassword('Tr0ub4dor&3', hash), false)
})

test('verifies a hash produced by the previous bcrypt library', async () => {
  // Generated by bcrypt@5 with cost 10 for the password "reactmap".
  const legacy = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
  assert.equal(await verifyPassword('reactmap', legacy), true)
})

test('rejects passwords longer than bcrypt can hold', async () => {
  // bcrypt truncates at 72 bytes; Bun throws rather than silently truncating.
  await assert.rejects(() => hashPassword('a'.repeat(73)))
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test server/test/localPassword.test.js
```

Expected: FAIL — `hashPassword is not a function`. The functions do not exist yet.

- [ ] **Step 3: Implement**

In `server/src/services/LocalClient.js`, delete line 4 (`const bcrypt = require('bcrypt')`) and add these two functions above the `class LocalClient` declaration:

```js
const BCRYPT_COST = 10

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST })
}

/**
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return Bun.password.verify(password, hash)
}
```

Replace the call at line 66:

```js
                    password: await hashPassword(password),
```

Replace the call at line 84. Note this was `compareSync` and is now `await`ed — the enclosing function is already `async`, so only the call changes:

```js
            if (await verifyPassword(password, userExists.password)) {
```

Finally, extend the existing `module.exports` at the bottom of the file to include both functions alongside whatever it already exports.

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test server/test/localPassword.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full suite**

```bash
bun test 2>&1 | tail -10
```

Expected: the Task 1 baseline count plus 5.

- [ ] **Step 6: Remove the dependency**

```bash
bun remove bcrypt
grep -rn "require('bcrypt')\|from 'bcrypt'" server src packages || echo "no remaining references"
```

Expected: "no remaining references".

- [ ] **Step 7: Commit**

```bash
git add server/src/services/LocalClient.js server/test/localPassword.test.js package.json bun.lock
git commit -m "feat!: replace bcrypt with Bun.password

Bun.password produces and verifies \$2b\$ bcrypt hashes, so existing stored
password hashes keep working - covered by a test using a hash generated by
bcrypt@5.

One behaviour change: bcrypt silently truncated passwords at 72 bytes and
Bun throws instead. That is the safer default and is covered by a test.

Removes the only native dependency in the tree.

BREAKING CHANGE: ReactMap now requires Bun rather than Node. Operators must
install Bun and rebuild their images.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Replace `node-fetch` with native `fetch`

**Files:**

- Modify: `server/src/utils/fetchJson.js`, `server/src/services/areas.js`, `server/src/services/scannerApi.js`, `server/src/services/EventManager.js`, `server/src/services/TelegramClient.js`, `server/src/services/logUserAuth.js`, `packages/masterfile/lib/index.js`, `packages/locales/lib/create.js`
- Modify: `server/src/utils/evalScannerQuery.js` (a doc comment only)
- Modify: `package.json`, and `@types/node-fetch` in devDependencies

**Interfaces:**

- Consumes: Bun from Task 1.
- Produces: no signature changes. `fetchJson(url, options)` keeps its exact shape; only the `Response` type origin changes.

Bun provides a WHATWG-standard global `fetch`, so every import is simply deleted. The one non-mechanical part is `fetchJson.js`, which imports `Response` as a _value_ for an `instanceof` check.

- [ ] **Step 1: Write the failing test**

Create `server/test/fetchJson.test.js`:

```js
const assert = require('node:assert/strict')
const { test } = require('bun:test')

const { fetchJson } = require('../src/utils/fetchJson')

test('returns parsed JSON on success', async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => Response.json({ ok: true, value: 42 }),
  })
  const result = await fetchJson(`http://localhost:${server.port}/thing`)
  server.stop()
  assert.deepEqual(result, { ok: true, value: 42 })
})

test('returns the Response on a by-id 404 rather than throwing', async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response('nope', { status: 404 }),
  })
  const result = await fetchJson(
    `http://localhost:${server.port}/api/pokemon/id/123`,
  )
  server.stop()
  assert.equal(result.status, 404)
})
```

The second test pins the existing special case at `fetchJson.js:57-64`, where a 404 on a by-id lookup is treated as an expected miss.

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test server/test/fetchJson.test.js
```

Expected: FAIL — `Cannot find module 'node-fetch'`, because Task 1 removed it from resolution, or a type error on the `Response` import.

- [ ] **Step 3: Implement in `fetchJson.js`**

Delete line 5:

```js
const { default: fetch, Response } = require('node-fetch')
```

Both `fetch` and `Response` are globals under Bun. Then update the two JSDoc type references, at lines 18 and 36, from `import('node-fetch').RequestInit` to plain `RequestInit`.

- [ ] **Step 4: Implement in the other seven files**

In each of `areas.js`, `scannerApi.js`, `EventManager.js`, `TelegramClient.js`, `logUserAuth.js`, `packages/masterfile/lib/index.js`, `packages/locales/lib/create.js`, delete the line:

```js
const { default: fetch } = require('node-fetch')
```

In `scannerApi.js` line 94, change the JSDoc type `import('node-fetch').RequestInit` to `RequestInit`. In `evalScannerQuery.js` line 67, update the doc comment's reference to "node-fetch `Response`" to just "`Response`".

- [ ] **Step 5: Verify no references remain**

```bash
grep -rn "node-fetch" server src packages || echo "clean"
```

Expected: "clean".

- [ ] **Step 6: Run the tests**

```bash
bun test 2>&1 | tail -10
```

Expected: Task 3's count plus 2.

- [ ] **Step 7: Remove the dependencies and commit**

```bash
bun remove node-fetch @types/node-fetch
git add -A
git commit -m "refactor: use the native fetch instead of node-fetch

Bun provides a WHATWG-standard global fetch and Response, so every import
is redundant. fetchJson keeps its exact signature, including the deliberate
404-is-a-miss behaviour for by-id endpoints, which is now covered by a test.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Replace ESLint and Prettier with Biome

**Files:**

- Create: `biome.json`
- Delete: `.eslintrc`, `.eslintignore`, `.prettierrc`, `.prettierignore`
- Modify: `package.json`, `.husky/pre-commit`

**Interfaces:**

- Consumes: Bun from Task 1.
- Produces: `bun run lint` checks, `bun run format` writes. Every later task's verification includes `bun run lint`.

- [ ] **Step 1: Install Biome and generate a config**

```bash
bun add -d @biomejs/biome
bunx biome init
```

- [ ] **Step 2: Write `biome.json`**

Replace the generated file. This preserves the formatting choices from `.prettierrc` and the rule relaxations that the airbnb config had turned off:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": [
      "**",
      "!dist/**",
      "!dist-*/**",
      "!**/node_modules/**",
      "!packages/locales/lib/**/*.json",
      "!packages/masterfile/lib/data/**"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    },
    "globals": ["CONFIG", "Bun"]
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useTemplate": "off",
        "noParameterAssign": "off",
        "useNodejsImportProtocol": "off"
      },
      "suspicious": {
        "noAssignInExpressions": "off",
        "noDoubleEquals": "off"
      },
      "complexity": {
        "noForEach": "off"
      }
    }
  }
}
```

- [ ] **Step 3: Run Biome and see the damage**

```bash
bunx biome check 2>&1 | tail -30
```

Expected: a large number of diagnostics. This is the failing state.

- [ ] **Step 4: Apply safe fixes and format**

```bash
bunx biome check --write --unsafe
```

- [ ] **Step 5: Verify the suite still passes after reformatting**

```bash
bun test 2>&1 | tail -10
```

Expected: Task 4's count, unchanged. **Formatting must not change behaviour.** If any test now fails, `--unsafe` rewrote something semantically — revert with `git checkout -- .` and rerun Step 4 without `--unsafe`, then fix the remainder by hand.

- [ ] **Step 6: Check for remaining diagnostics**

```bash
bunx biome check 2>&1 | tail -20
```

If diagnostics remain, fix them in the source. Do **not** disable a rule to silence a genuine finding; only add a rule to `biome.json` if it conflicts with a deliberate repo-wide convention.

- [ ] **Step 7: Swap the scripts**

In `package.json`, replace the `lint`, `lint:fix`, `prettier` and `prettier:fix` scripts with two:

```json
    "lint": "biome check",
    "format": "biome check --write --unsafe",
```

Remove the `lint-staged` block entirely.

- [ ] **Step 8: Update the pre-commit hook**

Replace `.husky/pre-commit`:

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bunx biome check --staged --no-errors-on-unmatched
```

Leave `.husky/commit-msg` alone — commitlint stays.

- [ ] **Step 9: Remove the old tooling**

```bash
bun remove eslint eslint-config-airbnb eslint-config-prettier eslint-import-resolver-alias eslint-plugin-import eslint-plugin-jsx-a11y eslint-plugin-react eslint-plugin-react-hooks prettier lint-staged
rm -f .eslintrc .eslintignore .prettierrc .prettierignore
```

- [ ] **Step 10: Full verification**

```bash
bun run lint && bun test 2>&1 | tail -5 && bun run build 2>&1 | tail -5
```

Expected: lint clean, tests at Task 4's count, build succeeds.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: replace eslint and prettier with biome

One tool instead of two. The formatter config reproduces the previous
prettier settings; the linter config re-disables the rules the airbnb
config had turned off, so this is a tooling swap rather than a style change.

Drops ten devDependencies and the lint-staged layer - biome checks staged
files directly.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Strict TypeScript config and a typecheck gate

**Files:**

- Create: `tsconfig.json`, `tsconfig.app.json`
- Delete: `jsconfig.json`
- Modify: `package.json`, `.github/workflows/lint.yml`, `.husky/pre-commit`, `vite.config.js`

**Interfaces:**

- Consumes: Bun from Task 1, Biome from Task 5.
- Produces: `bun run typecheck` runs `tsc --noEmit`. `tsconfig.app.json` is what Task 7's `app/` compiles against.

**Important:** the existing 531 `@ts-check`'d JS files are **not** in scope for strict checking. Turning `strict` on across `src/` and `server/src/` would produce thousands of errors and is a later plan. The root config checks JS loosely, exactly as `jsconfig.json` did; `tsconfig.app.json` is strict and covers only `app/`.

- [ ] **Step 1: Install the Bun type definitions**

```bash
bun add -d bun-types @types/react @types/react-dom
```

`bun-types` is what makes `Bun.password` (Task 3) and `Bun.serve` (Task 4's tests) type-check.

- [ ] **Step 2: Write the failing test**

Create `app/typecheck-canary.ts` — a file that must fail under strict mode and pass without it:

```ts
export function canary(value: string | undefined): number {
  // Under `strict`, this is an error: 'value' is possibly 'undefined'.
  return value.length
}
```

- [ ] **Step 3: Run the typecheck to verify it fails**

```bash
bunx tsc -p tsconfig.app.json --noEmit
```

Expected: FAIL — `tsconfig.app.json` does not exist yet.

- [ ] **Step 4: Create the root `tsconfig.json`**

Carries over every compiler option and path alias from `jsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["bun-types"],
    "paths": {
      "@assets/*": ["./src/assets/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@services/*": ["./src/services/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@utils/*": ["./src/utils/*"],
      "@store/*": ["./src/store/*"]
    }
  },
  "exclude": ["node_modules", "**/node_modules/*", "dist", "dist-*"]
}
```

- [ ] **Step 5: Create `tsconfig.app.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowJs": false,
    "paths": {
      "@app/*": ["./app/*"]
    }
  },
  "include": ["app/**/*.ts", "app/**/*.tsx"]
}
```

**The `paths` override is deliberate, not an oversight.** `compilerOptions.paths` replaces the
parent's map rather than merging with it, so `@components`, `@features`, `@store` and the rest
do **not** resolve inside `app/`. That is the intent: `app/` is the greenfield 2.0 client and
must not import 1.0 code. An import that needs one of those aliases is a signal that something
is being carried across that should be rewritten instead.

- [ ] **Step 6: Run it and confirm the canary fails**

```bash
bunx tsc -p tsconfig.app.json --noEmit
```

Expected: FAIL with `'value' is possibly 'undefined'` in `app/typecheck-canary.ts`. **This proves strict mode is actually on.** A pass here means the config is not being applied.

- [ ] **Step 7: Fix the canary**

```ts
export function canary(value: string | undefined): number {
  return value?.length ?? 0
}
```

- [ ] **Step 8: Run it and confirm it passes**

```bash
bunx tsc -p tsconfig.app.json --noEmit
```

Expected: PASS, no output.

- [ ] **Step 9: Add the scripts**

```json
    "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.app.json --noEmit",
```

- [ ] **Step 10: Add the CI gate**

In `.github/workflows/lint.yml`, between the Test and Lint steps:

```yaml
- name: Typecheck
  run: bun run typecheck
```

- [ ] **Step 11: Uncomment the Vite checker**

In `vite.config.js`, in the `checker({...})` call, replace the commented-out typescript block with a live one:

```js
            checker({
              overlay: {
                initialIsOpen: false,
              },
              typescript: {
                tsconfigPath: './tsconfig.app.json',
              },
            }),
```

Note the `eslint` key inside `checker` must be **removed** — ESLint no longer exists after Task 5.

- [ ] **Step 12: Delete `jsconfig.json` and verify**

```bash
rm jsconfig.json
bun run typecheck && bun run lint && bun test 2>&1 | tail -5
```

Expected: all three clean.

- [ ] **Step 13: Add the typecheck to the pre-commit hook**

The spec requires `tsc` on pre-commit as well as in CI. Replace `.husky/pre-commit`:

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bunx biome check --staged --no-errors-on-unmatched
bun run typecheck
```

`tsc` is whole-project rather than staged-file, so this is the slowest hook step. If it
becomes painful in practice, narrow it to `tsc -p tsconfig.app.json --noEmit` — `app/` is the
only strict project and the only one where a type error can actually be introduced by hand.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "build: strict typescript config and a typecheck gate

tsconfig.json replaces jsconfig.json with the same options and aliases, so
the existing @ts-check'd JS is checked exactly as loosely as before.
tsconfig.app.json is strict and covers only app/, which is where 2.0 code
goes - converting the existing 531 files is a separate plan.

tsc now runs in CI and vite-plugin-checker's typescript block is live for
the first time.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Tailwind v4 and the second Vite entry

**Files:**

- Create: `app.html`, `app/main.tsx`, `app/App.tsx`, `app/styles.css`
- Delete: `app/typecheck-canary.ts`
- Modify: `vite.config.js`, `package.json`

**Interfaces:**

- Consumes: `tsconfig.app.json` from Task 6.
- Produces: `bun run build` emits two HTML entries. `app/` is where every later plan's client code goes. The `@app/*` path alias resolves.

- [ ] **Step 1: Write the failing test**

Create `app/build.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(import.meta.dir, '../dist')

test('the build emits the 1.0 entry', () => {
  expect(existsSync(resolve(dist, 'index.html'))).toBe(true)
})

test('the build emits the 2.0 entry', () => {
  expect(existsSync(resolve(dist, 'app.html'))).toBe(true)
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun run build > /dev/null 2>&1; bun test app/build.test.ts
```

Expected: FAIL on the second test — `app.html` is not emitted.

- [ ] **Step 3: Install Tailwind v4**

```bash
bun add -d tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Create `app/styles.css`**

Tailwind v4 is CSS-first — there is no `tailwind.config.js`. Tokens live here.

```css
@import 'tailwindcss';

@theme {
  --font-display: 'Fredoka', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Nunito', ui-sans-serif, system-ui, sans-serif;

  --color-accent-from: #7b5ce0;
  --color-accent-to: #e067a8;

  --radius-card: 1.125rem;
  --radius-sheet: 1.25rem;
}
```

- [ ] **Step 5: Create `app/App.tsx`**

```tsx
export function App() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white font-sans">
      <p className="text-lg text-neutral-500">ReactMap 2.0</p>
    </main>
  )
}
```

- [ ] **Step 6: Create `app/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Create `app.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ReactMap</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

Note the absence of `user-scalable=no` — the audit found that disabling pinch-zoom, and 2.0 does not.

- [ ] **Step 8: Wire both entries into `vite.config.js`**

Add the Tailwind plugin to the `plugins` array, after `react()`:

```js
      tailwindcss(),
```

with the import at the top of the file:

```js
const { default: tailwindcss } = require('@tailwindcss/vite')
```

Then replace the single `input` in `build` with two:

```js
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          app: resolve(__dirname, 'app.html'),
        },
```

**Note:** the existing config has `input` as a sibling of `rollupOptions`, which Vite ignores — it belongs inside `rollupOptions`. Move it, do not duplicate it.

Add the `@app` alias to `resolve.alias`:

```js
        '@app': resolve(__dirname, './app'),
```

- [ ] **Step 9: Run the build and the test**

```bash
bun run build > /dev/null 2>&1 && bun test app/build.test.ts
```

Expected: PASS, both tests.

- [ ] **Step 10: Remove the canary and verify everything**

```bash
rm app/typecheck-canary.ts
bun run typecheck && bun run lint && bun test 2>&1 | tail -5
```

Expected: all clean.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold the 2.0 client entry with tailwind v4

app.html and app/ build alongside the 1.0 entry from one vite config, so
both bundles land in dist/ and a per-user flag can choose between them
later. app/ renders a placeholder for now.

Tailwind v4 is CSS-first - tokens live in app/styles.css and there is no
tailwind.config.js. The new entry deliberately omits user-scalable=no.

Also moves rollupOptions.input to where vite actually reads it; it was
previously a sibling key and silently ignored.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Remove the `.custom.jsx` override plugin

**Files:**

- Delete: `packages/vite-plugins/lib/customFile.js`
- Modify: `packages/vite-plugins/lib/index.js`, `vite.config.js`

**Interfaces:**

- Consumes: Task 7's `vite.config.js`.
- Produces: `customFilePlugin` no longer exists. `hasCustom` is no longer computed.

This mechanism let operators drop a `Foo.custom.jsx` beside any source file and silently replace it at build time. It was never officially supported, and a restructured tree would break every override with no compiler signal.

- [ ] **Step 1: Write the failing test**

Create `packages/vite-plugins/test/noCustomFile.test.js`:

```js
const assert = require('node:assert/strict')
const { test } = require('bun:test')

const plugins = require('../lib/index.js')

test('customFilePlugin is no longer exported', () => {
  assert.equal('customFilePlugin' in plugins, false)
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
bun test packages/vite-plugins/test/noCustomFile.test.js
```

Expected: FAIL — the export still exists.

- [ ] **Step 3: Delete the plugin and its export**

```bash
rm packages/vite-plugins/lib/customFile.js
```

Remove the `customFilePlugin` line from `packages/vite-plugins/lib/index.js`.

- [ ] **Step 4: Remove it from `vite.config.js`**

Delete `customFilePlugin` from the destructured `require('@rm/vite-plugins')`. Delete the entire `hasCustom` IIFE (the `checkFolders` function assigned to `const hasCustom`). Delete the `...(hasCustom ? [customFilePlugin(isDevelopment)] : [])` entry from the `plugins` array. In the `define.CONFIG.client` block, remove the `hasCustom` key.

- [ ] **Step 5: Check for stragglers**

```bash
grep -rn "hasCustom\|customFile" src server packages vite.config.js || echo "clean"
```

Expected: "clean". If `src/` references `CONFIG.client.hasCustom`, replace those reads with `false` rather than leaving a dangling property.

- [ ] **Step 6: Run everything**

```bash
bun test 2>&1 | tail -5 && bun run typecheck && bun run lint && bun run build 2>&1 | tail -5
```

Expected: all clean, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat!: remove the .custom.jsx build-time override mechanism

Any Foo.custom.jsx beside a source file silently replaced it at build time,
with only a build warning. It was never officially supported, and the 2.0
client restructure would break every existing override with no compiler
signal - so it is removed deliberately rather than lost by accident.

BREAKING CHANGE: .custom.jsx and .custom.css overrides no longer apply.
Operators relying on them must fork or contribute the change upstream.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Done criteria

Run from a clean checkout of `v2`:

```bash
bun install --frozen-lockfile
bun run masterfile
bun test
bun run typecheck
bun run lint
bun run build
```

All six succeed. Then:

- `dist/index.html` and `dist/app.html` both exist.
- `grep -rn "node-fetch\|require('bcrypt')\|customFile\|hasCustom" src server packages vite.config.js` returns nothing.
- `ls .eslintrc .prettierrc jsconfig.json yarn.lock 2>&1` reports four missing files.
- `bun test` reports the Task 1 baseline count plus 9 new tests.
- Opening `app/` in an editor shows strict-mode errors on deliberate mistakes (e.g. adding `const x: string = undefined`).

## What this plan does not do

- Convert any existing file to TypeScript. 531 `@ts-check`'d files stay JavaScript and stay loosely checked.
- Touch `src/` or `server/src/` beyond the two dependency swaps.
- Add shadcn, MapLibre, deck.gl, or any UI. `app/` renders one line of placeholder text.
- Serve `app.html` to anyone. Routing and the per-user flag are Plan 2 (Shell & IA).
