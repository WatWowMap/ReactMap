/**
 * cyrb53 hash function
 * @param {string} str
 * @param {number} [seed]
 * @returns {[number, number]}
 */
export const cyrb53 = (str: string, seed: number = 0): [number, number] => {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed

  for (let i = 0, ch; i < str.length; i += 1) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return [h1, h2]
}

export const getOffset = (
  coords: [number, number],
  amount: number,
  id: string,
  seed: number = 0,
): [number, number] => {
  const rand = cyrb53(id, seed)

  return [0, 1].map((i) => {
    let offset = rand[i] * (0.0002 / 4294967296) - 0.0001

    offset += offset >= 0 ? -amount : amount

    return coords[i] + offset
  }) as [number, number]
}
