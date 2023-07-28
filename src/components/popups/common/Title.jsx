import * as React from 'react'
import { Typography } from '@mui/material'

import { useStore } from '@hooks/useStore'

/**
 *
 * @param {{
 *  children: React.ReactNode,
 *  backup?: string,
 *  sx?: import('@mui/material').SxProps
 * }} props
 * @returns
 */
export default function Title({ children, backup, sx }) {
  const popups = useStore((state) => state.popups)

  return (
    <Typography
      variant="subtitle2"
      align="center"
      noWrap={popups.names}
      onClick={() =>
        useStore.setState((prev) => ({
          popups: {
            ...prev.popups,
            names: !popups.names,
          },
        }))
      }
      sx={sx}
    >
      {children || backup}
    </Typography>
  )
}
