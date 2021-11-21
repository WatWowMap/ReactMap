import React from 'react'
import { Box } from '@material-ui/core'

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
