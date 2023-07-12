import React from 'react'
import { Box } from '@mui/material'

export default ({ children, value, index, virtual }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    style={virtual ? { height: '100%' } : {}}
  >
    {value === index && (
      <Box p={2} style={virtual ? { height: '95%' } : {}}>
        {children}
      </Box>
    )}
  </div>
)
