// @ts-check

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
    if (key === 'uid' || key === 'description' || value === undefined) return
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
      const response = await http.request(
        `${base(userId, category)}?include_descriptions=true`,
      )
      return response?.rules ?? []
    },

    /**
     * @param {string} userId
     * @param {string} category
     * @param {Record<string, any>[]} rules
     */
    async save(userId, category, rules) {
      const created = rules.filter((r) => r.uid == null)
      const edited = rules.filter((r) => r.uid != null)
      const calls = edited.map((r) =>
        http.request(`${base(userId, category)}/${r.uid}`, {
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
     * @param {string} userId
     * @param {string} category
     * @param {number[]} uids
     */
    async remove(userId, category, uids) {
      if (!uids.length) return
      await http.request(`${base(userId, category)}?uid=${uids.join(',')}`, {
        method: 'DELETE',
      })
    },
  }
}

module.exports = { createTrackingV2 }
