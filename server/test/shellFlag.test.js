const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('bun:test')

const { SHELL_FLAG_COLUMN } = require('../src/routes/clientRouter')

/**
 * The bug this guards against: Discord and Telegram build their session user
 * by spreading the whole users-table row, so a new column reaches them for
 * free. LocalClient.authHandler instead copies fields onto the user object one
 * at a time, so a new column silently never arrives unless someone remembers
 * to add the line. Flagging a local account onto the 2.0 shell did nothing,
 * nothing errored, and the column held the right value the whole time.
 *
 * Driving authHandler end to end would need the login to reach the field-copy
 * branch, which first runs areaPerms/webhookPerms/scannerPerms against live
 * app config, including a request-time `areas` value only populated during
 * real server boot. That is a lot of scaffolding for one field assignment, so
 * this pins the invariant structurally instead.
 *
 * The invariant is deliberately "spreads the row OR copies the flag", not
 * "keeps using a spread". Rewriting a client to assign fields explicitly is a
 * legitimate change as long as the flag comes along, and a test that failed on
 * correct code would just get deleted the first time it was inconvenient.
 */

/** @param {string} name */
const sourceOf = (name) =>
  readFileSync(require.resolve(`../src/services/${name}`), 'utf8')

const CLIENTS = ['LocalClient', 'DiscordClient', 'TelegramClient']

// Specifically the users-table row, which is the thing that carries columns.
// Matching a looser `...user` would also match LocalClient's `...user.perms`,
// and the general test below would then pass for a client that does not carry
// the flag at all.
const spreadsRow = /\.\.\.\s*userExists\b/
const copiesFlag = new RegExp(
  `\\b${SHELL_FLAG_COLUMN}\\s*[:=]\\s*\\w+\\.${SHELL_FLAG_COLUMN}\\b`,
)

CLIENTS.forEach((name) => {
  test(`${name} carries the shell flag onto the session user`, () => {
    const source = sourceOf(name)
    assert.ok(
      spreadsRow.test(source) || copiesFlag.test(source),
      `${name} neither spreads the user row nor copies ${SHELL_FLAG_COLUMN} explicitly, so a person flagged onto the 2.0 shell would silently stay on 1.0`,
    )
  })
})

test('local login copies the flag explicitly, since it does not spread the row', () => {
  // LocalClient is the one client that builds its session user field by field,
  // which is why it needed the assignment the other two get for free.
  assert.match(sourceOf('LocalClient'), copiesFlag)
})
