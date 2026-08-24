// @ts-check

import Collapse from '@mui/material/Collapse'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import * as React from 'react'

/**
 * @param {{
 *  name: string
 *  children: React.ReactNode
 * }} props
 */
export function AreaParent({ name, children }) {
  const search = useStorage((s) => s.filters?.scanAreas?.filter?.search || '')
  const expandAllScanAreas = useMemory((s) => s.config.misc.expandAllScanAreas)
  const open = useStorage((s) => s.scanAreasMenu === name)

  return (
    <TableCell padding="none" sx={{ border: 'none' }}>
      <Collapse
        in={expandAllScanAreas || open || !!search}
        timeout="auto"
        unmountOnExit
        sx={{ width: '100%' }}
      >
        <Table sx={{ width: '100%' }}>
          <TableBody sx={{ width: '100%' }}>{children}</TableBody>
        </Table>
      </Collapse>
    </TableCell>
  )
}
