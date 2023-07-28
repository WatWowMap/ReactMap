import * as React from 'react'
import { Typography } from '@mui/material'

import { useStore } from '@hooks/useStore'

/**
 *
 * @param {{
 *  children: React.ReactNode,
 *  backup?: string,
 *  variant?: import('@mui/material/Typography').TypographyProps['variant'],
 *  sx?: import('@mui/material').SxProps
 * }} props
 * @returns
 */
export default function Title({ children, variant = 'subtitle2', backup, sx }) {
  const names = useStore((state) => !!state.popups.names)

  return (
    <Typography
      variant={variant}
      align="center"
      noWrap={names}
      onClick={() =>
        useStore.setState((prev) => ({
          popups: {
            ...prev.popups,
            names: !prev.popups.names,
          },
        }))
      }
      sx={sx}
    >
      {children || backup}
    </Typography>
  )
}
