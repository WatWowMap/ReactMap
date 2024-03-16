// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

import { useHideElement } from '@hooks/useHideElement'

import { LocalesTable } from './components/LocalesTable'
import { LocalesHeader } from './components/LocalesHeader'
import { LocalesFooter } from './components/LocalesFooter'

export function LocalesPage() {
  useHideElement()
  return (
    <Box className="locales-layout">
      <LocalesHeader />
      <LocalesTable />
      <LocalesFooter />
    </Box>
  )
}
