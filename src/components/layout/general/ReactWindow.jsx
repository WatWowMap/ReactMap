import React from 'react'
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

export default function ReactWindow({
  columnCount, length, Tile, data, offset,
}) {
  return (
    <AutoSizer>
      {({ width, height }) => (
        <FixedSizeGrid
          className="grid"
          width={width}
          height={height}
          columnCount={columnCount}
          columnWidth={width / columnCount - 5}
          rowCount={Math.ceil(length / columnCount)}
          rowHeight={(columnCount > 1 ? 120 : 60) + offset}
          itemData={{
            ...data,
            columnCount,
          }}
        >
          {Tile}
        </FixedSizeGrid>
      )}
    </AutoSizer>
  )
}
