// @ts-check

/**
 * An IV percentage as a whole number, like on the map. IVs are 45ths, so no
 * value rounds to 0 or 100 unless it is one.
 * @param {number | string | null | undefined} iv
 * @returns {string}
 */
export function formatIv(iv) {
  const value = Number(iv)
  return Number.isFinite(value) ? `${Math.round(value)}` : ''
}
