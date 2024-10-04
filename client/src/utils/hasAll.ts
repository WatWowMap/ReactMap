export function checkIfHasAll(category: string, id: string): boolean {
  return (
    category === 'pokemon' ||
    (category === 'pokestops' &&
      !(
        id.startsWith('l') ||
        id.startsWith('i') ||
        id.startsWith('f') ||
        id.startsWith('a') ||
        id.startsWith('h') ||
        id.startsWith('b')
      )) ||
    (id.startsWith('t') && id !== 't0-0')
  )
}
