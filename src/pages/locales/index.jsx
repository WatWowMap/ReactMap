// @ts-check

import { useHideElement } from '@hooks/useHideElement'
import Box from '@mui/material/Box'
import { LocalesFooter } from './components/LocalesFooter'
import { LocalesHeader } from './components/LocalesHeader'
import { LocalesTable } from './components/LocalesTable'

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
