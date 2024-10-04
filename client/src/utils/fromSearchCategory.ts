export function fromSearchCategory(searchCategory: string): string {
  switch (searchCategory) {
    case 'lures':
    case 'nests':
    case 'quests':
    case 'invasions':
      return 'pokestops'
    case 'gyms':
    case 'raids':
      return 'gyms'
    default:
      return searchCategory
  }
}
