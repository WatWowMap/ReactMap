// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

/**
 *
 * @param {{
 *  children: React.ReactNode,
 *  value: number,
 *  index: number,
 *  virtual?: boolean,
 *  disablePadding?: boolean,
 * }} props
 */
export default function TabPanel({
  children,
  value,
  index,
  virtual,
  disablePadding,
}) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      style={virtual ? { height: '100%' } : {}}
    >
      {value === index && (
        <Box
          p={disablePadding ? 0 : 2}
          style={virtual ? { height: '95%' } : {}}
        >
          {children}
        </Box>
      )}
    </div>
  )
}
