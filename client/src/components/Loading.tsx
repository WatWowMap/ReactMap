import * as React from 'react'
import Box, { BoxProps } from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export function Loading({ children, ...props }: BoxProps) {
  return (
    <Box
      className="flex-center"
      flexDirection="column"
      height="100%"
      width="100%"
      {...props}
    >
      <CircularProgress color="primary" size={60} />
      <Typography color="secondary" pt={2} variant="h4">
        {children}
      </Typography>
    </Box>
  )
}
