import * as React from 'react'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useDeepStore } from '@store/useStorage'
import Box from '@mui/material/Box'

type RotatingIconButtonProps = import('@mui/material').IconButtonProps & {
  expand?: boolean
}

export const RotatingIconButton = styled(
  ({ expand: _, ...props }: RotatingIconButtonProps) => (
    <IconButton {...props} />
  ),
)(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: 'rotate(0deg)',
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: 'rotate(180deg)',
      },
    },
  ],
}))

export function ExpandWithState({
  fontSize = 'medium',
  field,
  ...props
}: {
  fontSize?: import('@mui/material').SvgIconProps['fontSize']
  field: import('@store/useStorage').UseStoragePaths
} & RotatingIconButtonProps) {
  const [expand, setExpand] = useDeepStore(field, false)

  const onClick = React.useCallback(() => {
    setExpand((prev) => !prev)
  }, [setExpand])

  return (
    <RotatingIconButton {...props} expand={!!expand} onClick={onClick}>
      <ExpandMoreIcon fontSize={fontSize} />
    </RotatingIconButton>
  )
}

export function CollapseWithState({
  children,
  field,
  in: extraLogic = true,
  ...props
}: {
  field: import('@store/useStorage').UseStoragePaths
} & import('@mui/material').CollapseProps) {
  const [expand] = useDeepStore(field, false)

  return (
    <Collapse
      in={!!expand && extraLogic}
      {...props}
      unmountOnExit
      timeout="auto"
    >
      {children}
    </Collapse>
  )
}

/**
 * Wrapper for a layout that can be expanded or collapsed. Intended to be used with 3 children.
 */
export function ExpandCollapse({
  children,
  ...props
}: {
  children: [React.ReactNode, React.ReactNode, React.ReactNode]
} & Omit<import('@mui/material').BoxProps, 'children'>) {
  return (
    <Box className="expand-collapse-layout" {...props}>
      {children}
    </Box>
  )
}
