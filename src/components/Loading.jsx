// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

/**
 * A basic loading component with a circular progress bar and a message.
 * @param {import('@mui/material').BoxProps} props
 * @returns
 */
export function Loading({ children, ...props }) {
  return (
    <Box
      className="flex-center"
      height="100%"
      width="100%"
      flexDirection="column"
      {...props}
    >
      <CircularProgress size={60} color="primary" />
      <Typography variant="h4" color="secondary" pt={2}>
        {children}
      </Typography>
    </Box>
  )
}
