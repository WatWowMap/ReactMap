// @ts-check

/**
 *
 * @param {string | Record<string, string>} content
 * @returns
 */
export function getBlockContent(content) {
  if (!content) return ''
  if (typeof content === 'string') return content
  return typeof content === 'object'
    ? content[localStorage.getItem('i18nextLng')] || Object.values(content)[0]
    : ''
}

/** @param {import("@rm/types").GridSizes} sizeObj */
export function getGridSizes(sizeObj) {
  return {
    xs: sizeObj?.xs || 12,
    sm: sizeObj?.sm || sizeObj?.xs || 12,
    md: sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    lg: sizeObj?.lg || sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    xl:
      sizeObj?.xl ||
      sizeObj?.lg ||
      sizeObj?.md ||
      sizeObj?.sm ||
      sizeObj?.xs ||
      12,
  }
}
