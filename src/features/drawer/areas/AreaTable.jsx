// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'

import { Query } from '@services/Query'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

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

  const allRows = React.useMemo(
    () =>
      (data?.scanAreasMenu || [])
        .map((area) => ({
          ...area,
          children: area.children.filter(
            (feature) =>
              search === '' ||
              feature.properties?.key?.toLowerCase()?.includes(search),
          ),
        }))
        .map(({ children, ...rest }) => {
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
          return { ...rest, children, rows }
        }),
    [data, search],
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
          {allRows.map(({ name, details, children, rows }) => {
            if (!children.length) return null
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
                  <AreaParent name={name}>
                    {rows.map((row, i) => (
                      <TableRow
                        key={`${row[0]?.properties?.key}-${row[1]?.properties?.key}`}
                      >
                        {row.map((feature, j) => (
                          <AreaChild
                            key={feature?.properties?.name || `${i}${j}`}
                            feature={feature}
                            allAreas={allAreas}
                            childAreas={children}
                            borderRight={row.length === 2 && j === 0}
                            colSpan={row.length === 1 ? 2 : 1}
                          />
                        ))}
                      </TableRow>
                    ))}
                  </AreaParent>
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
