const BCRYPT_COST = 10

/** The input length bcrypt has always silently truncated at, in bytes. */
const BCRYPT_MAX_BYTES = 72

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: BCRYPT_COST })
}

/**
 * Bun.password.verify throws on a value it cannot parse. Rows holding null or
 * garbage in the password column are ordinary here: every Discord and
 * Telegram account has one. Anything unparseable is simply not a match.
 */
async function matchesHash(
  password: string | Buffer,
  hash: string | null,
): Promise<boolean> {
  try {
    if (hash == null) return false
    return await Bun.password.verify(password, hash)
  } catch {
    return false
  }
}

/**
 * bcrypt truncated its input at 72 bytes, so hashes written before the move to
 * Bun.password encode only that prefix. Bun pre-hashes the whole input instead,
 * so a longer password no longer matches its own stored hash. On a failed
 * verify, retry against the bytes bcrypt would have seen.
 *
 * The bytes past 72 are ignored on purpose. Nothing in the stored hash covers
 * them, so there is no way to tell a correct tail from a mistyped one. Re-hashing
 * the submitted string here would freeze whatever tail was typed as the account's
 * real password and lock the owner out, with no reset flow to recover through.
 * Accepting the prefix and leaving the row alone is what bcrypt did for years,
 * which is the behaviour this migration is meant to preserve.
 *
 */
async function verifyPassword(
  password: string,
  hash: string | null,
): Promise<boolean> {
  if (await matchesHash(password, hash)) return true

  if (Buffer.byteLength(password, 'utf8') <= BCRYPT_MAX_BYTES) return false

  // Slice the bytes, not the characters. The two disagree for any non-ASCII
  // password, and a character-boundary slice would not reproduce what bcrypt
  // hashed. The cut may land inside a multi-byte character, which is fine and
  // is why this stays a Buffer: re-encoding a split character changes it.
  const truncated = Buffer.from(password, 'utf8').subarray(0, BCRYPT_MAX_BYTES)
  return matchesHash(truncated, hash)
}

export { hashPassword, verifyPassword }
