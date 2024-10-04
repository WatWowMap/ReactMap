import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import { VirtuosoGrid } from 'react-virtuoso'

const STYLE: React.CSSProperties = {
  height: '100%',
  width: '100%',
}

export const SQUARE_ITEM: import('@mui/material').SxProps = {
  aspectRatio: '1/1',
  outline: 'ButtonText 1px solid',
}

type SomeGridProps = Pick<
  import('@mui/material').Grid2Props,
  'xs' | 'sm' | 'md' | 'lg' | 'xl'
>

const Item: React.ComponentType<
  import('react-virtuoso').GridItemProps & { context?: SomeGridProps }
> = React.forwardRef(({ context, ...props }, ref) => (
  <Grid2 {...context} {...props} ref={ref} />
))

Item.displayName = 'Item'

const List: React.ComponentType<
  import('react-virtuoso').GridListProps & { context?: SomeGridProps }
> = React.forwardRef((props, ref) => (
  <Grid2 {...props} ref={ref} container alignItems="stretch" />
))

List.displayName = 'List'

export function VirtualGrid<T, U extends Record<string, any>>({
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
}: SomeGridProps & {
  data: T[]
  context?: U
  children: import('react-virtuoso').VirtuosoGridProps<
    T,
    U & SomeGridProps
  >['itemContent']
  Header?: React.ComponentType<U>
  Footer?: React.ComponentType<U>
  useWindowScroll?: boolean
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
      components={components}
      context={fullContext}
      data={data}
      itemContent={children}
      overscan={Math.max(1, Math.round(data.length * 0.1))}
      style={STYLE}
      totalCount={data.length}
      useWindowScroll={useWindowScroll}
    />
  )
}
