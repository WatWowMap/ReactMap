import * as React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link } from 'react-router-dom'

import ThemeToggle from '@components/layout/general/ThemeToggle'
import LocaleSelection from '@components/layout/general/LocaleSelection'

import { PageSelector } from './PageSelector'
import { ToggleEditor } from './ToggleEditor'
import { Download } from './Download'

export function Toolbar() {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="nowrap"
      height={55}
    >
      <Button component={Link} to="/">
        Go Back
      </Button>
      <Typography variant="h6">Playground</Typography>
      <PageSelector />
      <ToggleEditor />
      <Download />
      <Box width={150}>
        <LocaleSelection />
      </Box>
      <ThemeToggle />
    </Box>
  )
}
