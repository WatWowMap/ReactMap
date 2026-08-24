const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('bun:test')

const { SHELL_FLAG_COLUMN } = require('../src/routes/clientRouter')

/**
 * The bug this guards against: Discord and Telegram build their session user
 * by spreading the whole users-table row, so a new column reaches them for
 * free. LocalClient.authHandler instead copies fields onto the user object
 * one at a time, so a new column silently never arrives unless someone
 * remembers to add the line. Flagging a local account onto the 2.0 shell did
 * nothing, nothing errored, and the column held the right value the whole
 * time. Fixed in f52518be by adding the missing assignment.
 *
 * Driving authHandler end to end would need the login to reach the
 * field-copy branch, which first runs areaPerms/webhookPerms/scannerPerms
 * against live app config (including a request-time `areas` value only
 * populated during real server boot). Standing that config up is
 * significant scaffolding for one field, so this pins the same invariant
 * structurally instead, against the actual source rather than a duplicated
 * behavior assumption: LocalClient must still contain the copy line, and
 * Discord/Telegram must still build the session user by spreading the row
 * rather than switching to the same manual, easy-to-forget field-by-field
 * style.
 */

const localSource = readFileSync(
  require.resolve('../src/services/LocalClient'),
  'utf8',
)
const discordSource = readFileSync(
  require.resolve('../src/services/DiscordClient'),
  'utf8',
)
const telegramSource = readFileSync(
  require.resolve('../src/services/TelegramClient'),
  'utf8',
)

test('local login explicitly copies the shell flag onto the session user', () => {
  const copiesFlag = new RegExp(
    `user\\.${SHELL_FLAG_COLUMN}\\s*=\\s*userExists\\.${SHELL_FLAG_COLUMN}\\b`,
  )
  assert.match(localSource, copiesFlag)
})

test('Discord and Telegram build the session user by spreading the row, not by field copy', () => {
  // A row spread picks up any column, present or future, without a matching
  // line for each one. If either client ever moves to LocalClient's
  // per-field style, this stops being true for free and the flag needs its
  // own explicit copy there too, same as it now has in LocalClient.
  assert.match(discordSource, /\.\.\.\s*userExists\b/)
  assert.match(telegramSource, /\.\.\.\s*userExists\b/)
})
