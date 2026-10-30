// @ts-check

const { toV1Row, fromV1Row, v1Category, isIncidentRow } = require('./v1Adapter')

/**
 * @param {{ request: (path: string, options?: { method?: string, body?: any }) => Promise<any> }} http
 */
function createTrackingV1(http) {
  /**
   * @param {string} userId
   * @param {string} category
   */
  const base = (userId, category) =>
    `/api/tracking/${v1Category(category)}/${encodeURIComponent(userId)}`

  return {
    /**
     * @param {string} userId
     * @param {string} category
     * @returns {Promise<Record<string, any>[]>}
     */
    async list(userId, category) {
      const response = await http.request(base(userId, category))
      /** @type {Record<string, any>[]} */
      const rows = response?.[v1Category(category)] ?? []
      const wantIncident = category === 'incident'
      return rows
        .filter((row) => !wantIncident || isIncidentRow(row))
        .filter(
          (row) =>
            wantIncident || category !== 'invasion' || !isIncidentRow(row),
        )
        .map((row) => fromV1Row(category, row))
    },

    /**
     * @param {string} userId
     * @param {string} category
     * @param {Record<string, any>[]} rules
     */
    async save(userId, category, rules) {
      if (!rules.length) return
      // convert everything first so an unsupported rule sends nothing
      const rows = rules.map((rule) => toV1Row(category, rule))
      await http.request(base(userId, category), {
        method: 'POST',
        body: rows,
      })
    },

    /**
     * @param {string} userId
     * @param {string} category
     * @param {number[]} uids
     */
    async remove(userId, category, uids) {
      if (!uids.length) return
      await http.request(`${base(userId, category)}/delete`, {
        method: 'POST',
        body: uids,
      })
    },
  }
}

module.exports = { createTrackingV1 }
