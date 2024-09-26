import * as React from 'react'
import Box, { BoxProps } from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export function Loading({ children, ...props }: BoxProps) {
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
