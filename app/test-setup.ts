import { GlobalRegistrator } from '@happy-dom/global-registrator'

/*
 * bunfig.toml's [test] table has no per-directory scoping: a plain preload
 * registers happy-dom globally for the whole `bun test` run, which covers
 * every workspace in this monorepo, not just app/. That broke three
 * unrelated suites when tried: packages/masterfile (happy-dom's fetch
 * enforces CORS on a cross-origin request the real test relies on),
 * server/test/fetchJson (Bun.serve's `Response.json` resolved to happy-dom's
 * Response class instead of the native one, corrupting the wire format),
 * and app/build.test.ts (Vite's bundled code branches on `typeof document`,
 * and a permanently-present `document` global sent it down a browser code
 * path that doesn't apply here).
 *
 * `beforeAll`/`afterAll` declared inside a test file are scoped to that
 * file, unlike ones declared in a preload script, which run once for the
 * whole process. Call `setupDom`/`teardownDom` from a file's own
 * `beforeAll`/`afterAll` to register happy-dom only around that file's
 * tests, instead of registering it here at preload time.
 */
/*
 * Registered without a `url`, so the document location stays `about:blank`
 * and a relative `fetch` is not a URL at all. Components that fetch their
 * own data -- the sprite index, for one -- therefore take their failure
 * path here and log it. That is the intended trade: giving the document a
 * real origin makes those same fetches into real connection attempts
 * against whatever is listening on that port, which is a far worse thing
 * for a test suite to do than printing a caught warning.
 */
export function setupDom() {
  GlobalRegistrator.register()
}

export async function teardownDom() {
  await GlobalRegistrator.unregister()
}
