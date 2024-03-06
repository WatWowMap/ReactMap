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
