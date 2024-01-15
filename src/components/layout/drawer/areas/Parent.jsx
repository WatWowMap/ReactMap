// @ts-check
import * as React from 'react'
import { Table, TableBody, TableRow, Collapse, TableCell } from '@mui/material'
import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { AreaChild } from './Child'

/**
 * @param {{
 *  name: string
 *  rows: Pick<import('@rm/types').RMFeature, "properties">[][]
 *  childAreas: Pick<import('@rm/types').RMFeature, "properties">[]
 *  allAreas: string[]
 * }} props
 */
export function AreaParent({ name, rows, childAreas, allAreas }) {
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
          <TableBody sx={{ width: '100%' }}>
            {rows.map((row, i) => (
              <TableRow
                key={`${row[0]?.properties?.key}-${row[1]?.properties?.key}`}
              >
                {row.map((feature, j) => (
                  <AreaChild
                    key={feature?.properties?.name || `${i}${j}`}
                    feature={feature}
                    allAreas={allAreas}
                    childAreas={childAreas}
                    borderRight={row.length === 2 && j === 0}
                    colSpan={row.length === 1 ? 2 : 1}
                  />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </TableCell>
  )
}
