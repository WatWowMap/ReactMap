// @ts-check

/**
 * Get rank badge, commonly used for pvp and contests
 * @param {number} rank
 * @returns
 */
export const getBadge = (rank) => {
  switch (rank) {
    case 1:
      return 'first'
    case 2:
      return 'second'
    case 3:
      return 'third'
    default:
      return ''
  }
}
