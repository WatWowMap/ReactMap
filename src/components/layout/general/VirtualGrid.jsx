// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import { VirtuosoGrid } from 'react-virtuoso'

const STYLE = /** @type {React.CSSProperties} */ ({ height: 400 })

/** @typedef {{ itemsPerRow?: number }} Prop */

/** @type {React.ComponentType<import('react-virtuoso').GridItemProps & { context: Prop }>} */
const Item = ({ context, ...props }) => (
  <Grid2 xs={Math.round(12 / (context?.itemsPerRow || 1))} {...props} />
)
const List = React.forwardRef((props, ref) => (
  <Grid2 {...props} container ref={ref} />
))

const components = { Item, List }

/**
 * @template T
 * @template {Record<string, any>} U
 * @param {Prop & {
 *  data: T[],
 *  context?: U,
 *  children: import('react-virtuoso').VirtuosoGridProps<T, U & Prop>['itemContent']
 * }} props
 */
export function VirtualGrid({ children, data, context, itemsPerRow = 3 }) {
  const fullContext = React.useMemo(
    () => ({ ...context, itemsPerRow }),
    [itemsPerRow, context],
  )
  return (
    <VirtuosoGrid
      style={STYLE}
      totalCount={data.length}
      overscan={5}
      data={data}
      context={fullContext}
      components={components}
      itemContent={children}
    />
  )
}
