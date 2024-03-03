// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

import { useStorage } from '@hooks/useStorage'

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
  const names = useStorage((state) => !!state.popups.names)

  return (
    <Typography
      variant={variant}
      align="center"
      noWrap={names}
      onClick={() =>
        useStorage.setState((prev) => ({
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
