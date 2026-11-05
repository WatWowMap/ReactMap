// @ts-check

const { pathInt, PoracleRequestError } = require('./http')

const INVASION_TARGETING = ['type_id', 'grunt_id', 'everything', 'boss']

/**
 * Strips what a v2 write must not carry.
 * @param {string} category
 * @param {Record<string, any>} rule
 * @param {boolean} isEdit
 */
function cleanRule(category, rule, isEdit) {
  /** @type {Record<string, any>} */
  const out = {}
  Object.entries(rule).forEach(([key, value]) => {
    // profile_no is not a v2 body field: it goes in the ?profile= query
    if (
      key === 'uid' ||
      key === 'description' ||
      key === 'profile_no' ||
      value === undefined
    )
      return
    if (isEdit && category === 'invasion' && INVASION_TARGETING.includes(key))
      return
    out[key] = value
  })
  return out
}

/**
 * @param {{ request: (path: string, options?: { method?: string, body?: any }) => Promise<any> }} http
 */
function createTrackingV2(http) {
  /**
   * @param {string} userId
   * @param {string} category
   */
  const base = (userId, category) =>
    `/api/v2/humans/${encodeURIComponent(userId)}/tracking/${category}`

  return {
    /**
     * @param {string} userId
     * @param {string} category
     * @returns {Promise<Record<string, any>[]>}
     */
    async list(userId, category) {
      // v2 lists don't say which profile they read, and a uid write without
      // ?profile= acts on whatever profile is active by then: read the active
      // one first and tag every rule with it, so edits and deletes name it.
      const { human } = await http.request(
        `/api/v2/humans/${encodeURIComponent(userId)}`,
      )
      const profile = human?.current_profile_no
      const known = Number.isInteger(profile)
      const response = await http.request(
        `${base(userId, category)}?include_descriptions=true${
          known ? `&profile=${profile}` : ''
        }`,
      )
      const rules = response?.rules ?? []
      return known
        ? rules.map((rule) => ({ ...rule, profile_no: profile }))
        : rules
    },

    /**
     * @param {string} userId
     * @param {string} category
     * @param {Record<string, any>[]} rules
     */
    async save(userId, category, rules) {
      const created = rules.filter((r) => r.uid == null)
      const edited = rules.filter((r) => r.uid != null)
      // validate every uid before the first request goes out
      const paths = edited.map(
        (r) =>
          `${base(userId, category)}/${pathInt(r.uid, 'rule uid')}${profileQuery(
            r.profile_no,
            '?',
          )}`,
      )
      const calls = edited.map((r, i) =>
        http.request(paths[i], {
          method: 'PUT',
          body: cleanRule(category, r, true),
        }),
      )
      if (created.length) {
        calls.push(
          http.request(base(userId, category), {
            method: 'POST',
            body: created.map((r) => cleanRule(category, r, false)),
          }),
        )
      }
      await Promise.all(calls)
    },

    /**
     * One bulk delete per profile the rules were read from. v2 skips a uid it
     * doesn't find in that profile, so a delete that removed fewer rules than
     * asked is an error rather than a silent success.
     * @param {string} userId
     * @param {string} category
     * @param {{ uid: number | string, profile_no?: number | null }[]} targets
     */
    async remove(userId, category, targets) {
      /** @type {Map<string, string[]>} */
      const byProfile = new Map()
      targets.forEach((target) => {
        const key = profileQuery(target.profile_no, '&')
        const uids = byProfile.get(key) || []
        uids.push(pathInt(target.uid, 'rule uid'))
        byProfile.set(key, uids)
      })
      const missing = (
        await Promise.all(
          [...byProfile].map(async ([query, uids]) => {
            const response = await http.request(
              `${base(userId, category)}?uid=${uids.join(',')}${query}`,
              { method: 'DELETE' },
            )
            const deleted = new Set(
              (response?.deleted || []).map((rule) => String(rule.uid)),
            )
            return uids.filter((uid) => !deleted.has(uid))
          }),
        )
      ).flat()
      if (missing.length) {
        throw new PoracleRequestError(
          `Rule ${missing.join(', ')} not found in its profile`,
          404,
        )
      }
    },
  }
}

/**
 * The ?profile= part for a rule's profile, empty when it has none.
 * @param {unknown} profileNo
 * @param {'?' | '&'} separator
 */
function profileQuery(profileNo, separator) {
  return profileNo === null || profileNo === undefined
    ? ''
    : `${separator}profile=${pathInt(profileNo, 'profile')}`
}

module.exports = { createTrackingV2 }
