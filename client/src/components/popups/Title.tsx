// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

import { useStorage } from '@store/useStorage'

/**
 *
 * @param {{
 *  children: React.ReactNode,
 *  backup?: string,
 * } & import('@mui/material').TypographyProps} props
 * @returns
 */
export function Title({ children, variant = 'subtitle2', backup, ...props }) {
  const names = useStorage((s) => !!s.popups.names)

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
      {...props}
    >
      {children || backup}
    </Typography>
  )
}
