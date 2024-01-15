// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import {
  TableContainer,
  Table,
  TableBody,
  TableRow,
  Paper,
} from '@mui/material'

import Query from '@services/Query'
import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

import { AreaParent } from './Parent'
import { AreaChild } from './Child'

export function ScanAreasTable() {
  /** @type {import('@apollo/client').QueryResult<{ scanAreasMenu: import('@rm/types').Config['areas']['scanAreasMenu'][string] }>} */
  const { data, loading, error } = useQuery(Query.scanAreasMenu())
  const search = useStorage(
    (s) => s.filters.scanAreas?.filter?.search?.toLowerCase() || '',
  )
  const { misc } = useMemory.getState().config

  /** @type {string[]} */
  const allAreas = React.useMemo(
    () =>
      data?.scanAreasMenu.flatMap((parent) =>
        parent.children
          .filter((child) => !child.properties.manual)
          .map((child) => child.properties.key),
      ) || [],
    [data],
  )

  if (loading || error) return null

  return (
    <TableContainer
      component={Paper}
      sx={{
        minHeight: 50,
        maxHeight: misc.scanAreaMenuHeight || 400,
        overflow: 'auto',
      }}
    >
      <Table
        size="small"
        sx={(theme) => ({
          borderTop: 1,
          borderColor:
            theme.palette.grey[theme.palette.mode === 'dark' ? 800 : 200],
        })}
      >
        <TableBody>
          {data?.scanAreasMenu
            ?.map((area) => ({
              ...area,
              children: area.children.filter(
                (feature) =>
                  search === '' ||
                  feature.properties?.key?.toLowerCase()?.includes(search),
              ),
            }))
            .map(({ name, details, children }) => {
              if (!children.length) return null
              const rows = []
              for (let i = 0; i < children.length; i += 1) {
                const newRow = []
                if (children[i]) newRow.push(children[i])
                if (
                  children[i + 1] &&
                  (children[i]?.properties?.name?.length || 0) +
                    (children[i + 1]?.properties?.name?.length || 0) <
                    40
                )
                  // eslint-disable-next-line no-plusplus
                  newRow.push(children[++i])
                rows.push(newRow)
              }
              return (
                <React.Fragment key={`${name}-${children.length}`}>
                  {name && (
                    <TableRow>
                      <AreaChild
                        name={name}
                        feature={details}
                        allAreas={allAreas}
                        childAreas={children}
                        colSpan={2}
                      />
                    </TableRow>
                  )}
                  <TableRow>
                    <AreaParent
                      name={name}
                      rows={rows}
                      allAreas={allAreas}
                      childAreas={children}
                    />
                  </TableRow>
                </React.Fragment>
              )
            })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
