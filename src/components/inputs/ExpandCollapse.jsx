// @ts-check

import * as React from 'react'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useDeepStore } from '@store/useStorage'
import Box from '@mui/material/Box'

/**
 * @typedef {import('@mui/material').IconButtonProps & { expand?: boolean }} RotatingIconButtonProps
 */

export const RotatingIconButton = styled(
  (
    /** @type {RotatingIconButtonProps} */ {
      // eslint-disable-next-line no-unused-vars
      expand,
      ...props
    },
  ) => <IconButton {...props} />,
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

/**
 *
 * @param {{
 *  fontSize?: import('@mui/material').SvgIconProps['fontSize'],
 *  field: import('@store/useStorage').UseStoragePaths
 * } & RotatingIconButtonProps} props
 * @returns
 */
export function ExpandWithState({ fontSize = 'medium', field, ...props }) {
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

/**
 *
 * @param {{ field: import('@store/useStorage').UseStoragePaths } & import('@mui/material').CollapseProps} props
 */
export function CollapseWithState({
  children,
  field,
  in: extraLogic = true,
  ...props
}) {
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
 *
 * @param {{
 *  children: [React.ReactNode, React.ReactNode, React.ReactNode]
 * } & Omit<import('@mui/material').BoxProps, 'children'>} props
 */
export function ExpandCollapse({ children, ...props }) {
  return (
    <Box className="expand-collapse-layout" {...props}>
      {children}
    </Box>
  )
}
