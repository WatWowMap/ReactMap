import * as React from 'react'
import Box from '@mui/material/Box'

export function TabPanel({
  children,
  value,
  index,
  disablePadding,
}: {
  children: React.ReactNode
  value: number
  index: number
  disablePadding?: boolean
}) {
  return (
    <Box
      height="100%"
      hidden={value !== index}
      p={disablePadding ? 0 : 2}
      role="tabpanel"
    >
      {children}
    </Box>
  )
}
