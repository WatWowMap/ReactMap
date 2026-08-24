// @ts-check

import Box from '@mui/material/Box'
import * as React from 'react'

/**
 * @param {{
 *  children: React.ReactNode,
 *  value: number,
 *  index: number,
 *  disablePadding?: boolean
 * }} props
 */
export function TabPanel({ children, value, index, disablePadding }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      height="100%"
      p={disablePadding ? 0 : 2}
    >
      {children}
    </Box>
  )
}
