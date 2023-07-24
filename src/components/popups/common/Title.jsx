import React from 'react'
import { Typography } from '@mui/material'

import { useStore } from '@hooks/useStore'

export default function Title({ children, backup }) {
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
    >
      {children || backup}
    </Typography>
  )
}
