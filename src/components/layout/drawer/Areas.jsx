/* eslint-disable react/no-array-index-key */
import * as React from 'react'
import { useMap } from 'react-leaflet'
import { useQuery } from '@apollo/client'
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItem,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  Collapse,
  TableCell,
  Paper,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import Query from '@services/Query'
import { useStatic, useStore } from '@hooks/useStore'
import AreaTile from './AreaTile'
import { ItemSearch } from './ItemSearch'

export default function AreaDropDown() {
  const { data, loading, error } = useQuery(Query.scanAreasMenu())
  const { t } = useTranslation()
  const filters = useStore((s) => s.filters)
  const { setAreas } = useStore.getState()
  const { config } = useStatic.getState()
  const map = useMap()
  const [open, setOpen] = React.useState('')

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
    <>
      <ListItemButton onClick={() => setAreas()}>
        <ListItemIcon>
          <RestartAltIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('reset')} />
      </ListItemButton>
      <ItemSearch field="filters.scanAreas.filter.search" />
      <ListItem>
        <TableContainer
          component={Paper}
          sx={{
            minHeight: 50,
            maxHeight: config.misc.scanAreaMenuHeight || 400,
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
                      filters.scanAreas?.filter?.search === '' ||
                      feature.properties?.key
                        ?.toLowerCase()
                        ?.includes(
                          filters?.scanAreas?.filter?.search?.toLowerCase(),
                        ),
                  ),
                }))
                .map(({ name, details, children }) => {
                  if (!children.length) return null
                  const rows = []
                  for (let i = 0; i < children.length; i += 2) {
                    const newRow = []
                    if (children[i]) newRow.push(children[i])
                    if (children[i + 1]) newRow.push(children[i + 1])
                    rows.push(newRow)
                  }
                  return (
                    <React.Fragment key={`${name}-${children.length}`}>
                      {name && (
                        <TableRow>
                          <AreaTile
                            name={name}
                            feature={details}
                            allAreas={allAreas}
                            childAreas={children}
                            scanAreasZoom={config.general.scanAreasZoom}
                            map={map}
                            scanAreas={filters.scanAreas}
                            setAreas={setAreas}
                            open={open}
                            setOpen={
                              config.misc.expandAllScanAreas
                                ? undefined
                                : setOpen
                            }
                            colSpan={2}
                          />
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell padding="none" sx={{ border: 'none' }}>
                          <Collapse
                            in={
                              config.misc.expandAllScanAreas ||
                              open === name ||
                              !!filters?.scanAreas?.filter?.search
                            }
                            timeout="auto"
                            unmountOnExit
                            sx={{ width: '100%' }}
                          >
                            <Table sx={{ width: '100%' }}>
                              <TableBody sx={{ width: '100%' }}>
                                {rows.map((row, i) => (
                                  <TableRow key={i}>
                                    {row.map((feature, j) => (
                                      <AreaTile
                                        key={feature?.properties?.name || i}
                                        feature={feature}
                                        allAreas={allAreas}
                                        childAreas={children}
                                        scanAreasZoom={
                                          config.general.scanAreasZoom
                                        }
                                        map={map}
                                        borderRight={
                                          row.length === 2 && j === 0
                                        }
                                        scanAreas={filters.scanAreas}
                                        setAreas={setAreas}
                                        colSpan={row.length === 1 ? 2 : 1}
                                      />
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </ListItem>
    </>
  )
}
