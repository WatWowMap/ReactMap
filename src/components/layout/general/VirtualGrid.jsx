// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import { VirtuosoGrid } from 'react-virtuoso'

const STYLE = /** @type {React.CSSProperties} */ ({
  height: '100%',
  width: '100%',
})

/** @typedef {Pick<import('@mui/material').Grid2Props, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>} Prop */

/** @type {React.ComponentType<import('react-virtuoso').GridItemProps & { context?: Prop }>} */
const Item = ({ context, ...props }) => <Grid2 {...context} {...props} />

/** @type {React.ComponentType<import('react-virtuoso').GridListProps & { context?: Prop }>} */
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
 * } & Pick<import('@mui/material').Grid2Props, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>} props
 */
export function VirtualGrid({ children, data, context, xs, sm, md, lg, xl }) {
  const fullContext = React.useMemo(
    () => ({ ...context, xs, sm, md, lg, xl }),
    [xs, sm, md, lg, xl, context],
  )
  return (
    <VirtuosoGrid
      style={STYLE}
      totalCount={data.length}
      overscan={data.length * 0.1}
      data={data}
      context={fullContext}
      components={components}
      itemContent={children}
    />
  )
}
