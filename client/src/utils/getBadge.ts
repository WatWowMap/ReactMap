/**
 * Get rank badge, commonly used for pvp and contests
 */
export const getBadge = (rank: number) => {
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
