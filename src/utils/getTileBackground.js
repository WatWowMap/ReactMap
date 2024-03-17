// @ts-check

/**
 *
 * @param {number} columnIndex
 * @param {number} rowIndex
 */
export function getTileBackground(columnIndex, rowIndex) {
  return columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
    ? 'rgba(1, 1, 1, 0.01)'
    : 'rgba(240, 240, 240, 0.01)'
}
