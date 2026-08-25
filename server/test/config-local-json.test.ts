// The bug this covers was silent and total: `applyMutations` checked for
// `local.json` in `server/src/configs`, where the file has not lived since
// the config directories were reorganised, so the check never found one.
// The env-var branch it guards therefore ran on every boot and its
// unconditional `config.database.schemas = []` discarded whatever the
// operator had configured, leaving them connected to something they never
// asked for or to nothing at all.
//
// Driven as a subprocess rather than by importing the module: `@rm/config`
// resolves `NODE_CONFIG_DIR` and reads the filesystem at require time and
// caches the result, so a test that manipulates files in-process would be
// asserting against whichever state won the race to load first.

import { describe, expect, test } from 'bun:test'
import { existsSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

const repoRoot = join(import.meta.dir, '..', '..')
const localJson = join(repoRoot, 'config', 'local.json')
const stash = join(repoRoot, 'config', 'local.json.teststash')

const PROBE = {
  database: {
    schemas: [
      {
        note: 'PROBE',
        host: 'probe-host.invalid',
        port: 9999,
        username: 'probe_user',
        password: 'probe_pw',
        database: 'probe_db',
        useFor: ['user'],
      },
    ],
  },
}

const SCANNER_ENV = {
  SCANNER_DB_HOST: 'env-scanner.invalid',
  SCANNER_DB_PORT: '3306',
  SCANNER_DB_NAME: 'sdb',
  SCANNER_DB_USERNAME: 'su',
  SCANNER_DB_PASSWORD: 'sp',
}

/** Reads `database.schemas` out of a fresh process, so nothing is cached. */
async function schemasWithEnv(env: Record<string, string>) {
  const result = Bun.spawnSync({
    cmd: [
      'bun',
      '-e',
      "console.log('SCHEMAS:' + JSON.stringify(require('./packages/config').getSafe('database.schemas')))",
    ],
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const line = new TextDecoder()
    .decode(result.stdout)
    .split('\n')
    .find((each) => each.startsWith('SCHEMAS:'))
  if (!line) throw new Error('config subprocess printed no schemas')
  return JSON.parse(line.slice('SCHEMAS:'.length)) as {
    note?: string
    host: string
  }[]
}

describe('config/local.json and the database env vars', () => {
  test('a configured local.json is not discarded in favour of env vars', async () => {
    const had = existsSync(localJson)
    if (had) renameSync(localJson, stash)
    writeFileSync(localJson, JSON.stringify(PROBE))
    try {
      // Scanner env vars are set too, which is the case that used to lose:
      // the env branch ran regardless and wiped the configured schemas.
      const schemas = await schemasWithEnv(SCANNER_ENV)
      expect(schemas.map((each) => each.note)).toEqual(['PROBE'])
      expect(schemas[0]?.host).toBe('probe-host.invalid')
    } finally {
      unlinkSync(localJson)
      if (had) renameSync(stash, localJson)
    }
  })

  test('without a local.json the env vars still build the schemas', async () => {
    const had = existsSync(localJson)
    if (had) renameSync(localJson, stash)
    try {
      const schemas = await schemasWithEnv(SCANNER_ENV)
      expect(schemas.some((each) => each.host === 'env-scanner.invalid')).toBe(
        true,
      )
    } finally {
      if (had) renameSync(stash, localJson)
    }
  })
})
