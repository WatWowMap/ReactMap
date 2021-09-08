import React from 'react'
import { Box, Typography } from '@material-ui/core'

export default ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
  >
    {value === index && (
      <Box p={2}>
        <Typography variant="caption">{children}</Typography>
      </Box>
    )}
  </div>
)
