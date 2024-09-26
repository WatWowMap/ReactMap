export function getTileBackground(columnIndex: number, rowIndex: number) {
  return columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
}
