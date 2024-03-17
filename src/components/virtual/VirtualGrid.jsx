// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import { VirtuosoGrid } from 'react-virtuoso'

const STYLE = /** @type {React.CSSProperties} */ ({
  height: '100%',
  width: '100%',
})

export const SQUARE_ITEM = /** @type {import('@mui/material').SxProps} */ ({
  aspectRatio: '1/1',
  outline: 'ButtonText 1px solid',
})

/** @typedef {Pick<import('@mui/material').Grid2Props, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>} SomeGridProps */

/** @type {React.ComponentType<import('react-virtuoso').GridItemProps & { context?: SomeGridProps }>} */
const Item = ({ context, ...props }) => <Grid2 {...context} {...props} />

/** @type {React.ComponentType<import('react-virtuoso').GridListProps & { context?: SomeGridProps }>} */
const List = React.forwardRef((props, ref) => (
  <Grid2 {...props} container alignItems="stretch" ref={ref} />
))

/**
 * @template T
 * @template {Record<string, any>} U
 * @param {SomeGridProps & {
 *  data: T[],
 *  context?: U,
 *  children: import('react-virtuoso').VirtuosoGridProps<T, U & SomeGridProps>['itemContent'],
 *  Header?: React.ComponentType<U>,
 *  Footer?: React.ComponentType<U>,
 *  useWindowScroll?: boolean
 * }} props
 */
export function VirtualGrid({
  children,
  data,
  context,
  xs,
  sm,
  md,
  lg,
  xl,
  Header,
  Footer,
  useWindowScroll,
}) {
  const fullContext = React.useMemo(
    () => ({ ...context, xs, sm, md, lg, xl }),
    [xs, sm, md, lg, xl, context],
  )
  const components = React.useMemo(
    () => ({ List, Item, Header, Footer }),
    [Header, Footer],
  )
  return (
    <VirtuosoGrid
      style={STYLE}
      totalCount={data.length}
      overscan={Math.max(1, Math.round(data.length * 0.1))}
      data={data}
      context={fullContext}
      components={components}
      itemContent={children}
      useWindowScroll={useWindowScroll}
    />
  )
}
