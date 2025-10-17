// @ts-check
import * as React from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import TableContainer from '@mui/material/TableContainer'
import Typography from '@mui/material/Typography'

import { Query } from '@services/queries'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useMapStore } from '@store/useMapStore'

/** @typedef {{ id: string, name: string, lat: number, lon: number }} JumpResult */

import { AreaParent } from './Parent'
import { AreaChild } from './Child'

export function ScanAreasTable() {
  /** @type {import('@apollo/client').QueryResult<{ scanAreasMenu: import('@rm/types').Config['areas']['scanAreasMenu'][string] }>} */
  const { data, loading, error } = useQuery(Query.scanAreasMenu())
  const { t, i18n } = useTranslation()
  const rawSearch = useStorage((s) => s.filters.scanAreas?.filter?.search || '')
  const search = React.useMemo(() => rawSearch.toLowerCase(), [rawSearch])
  const trimmedSearch = React.useMemo(() => rawSearch.trim(), [rawSearch])
  const { misc, general } = useMemory.getState().config
  const jumpZoom = general?.scanAreasZoom || general?.startZoom || 12
  /** @type {[JumpResult[], React.Dispatch<React.SetStateAction<JumpResult[]>>]} */
  const [jumpResults, setJumpResults] = React.useState([])
  const [jumpLoading, setJumpLoading] = React.useState(false)
  const [jumpError, setJumpError] = React.useState(false)

  const handleJump = React.useCallback(
    (target) => {
      const mapInstance = useMapStore.getState().map
      if (mapInstance) {
        mapInstance.flyTo([target.lat, target.lon], jumpZoom)
      }
    },
    [jumpZoom],
  )

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

  const totalMatches = React.useMemo(
    () => allRows.reduce((sum, area) => sum + area.children.length, 0),
    [allRows],
  )

  const showJumpResults =
    trimmedSearch.length >= 3 && totalMatches === 0 && !loading && !error

  React.useEffect(() => {
    if (!showJumpResults) {
      if (trimmedSearch.length < 3) {
        setJumpResults([])
      }
      setJumpLoading(false)
      setJumpError(false)
      return
    }

    setJumpResults([])
    setJumpLoading(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmedSearch)}&accept-language=${encodeURIComponent(i18n.language || 'en')}`,
        { signal: controller.signal, headers: { Accept: 'application/json' } },
      )
        .then((res) => {
          if (!res.ok) throw new Error('Nominatim request failed')
          return res.json()
        })
        .then((json) => {
          if (!Array.isArray(json)) {
            setJumpResults([])
            return
          }
          setJumpResults(
            json
              .slice(0, 5)
              .map((item) => ({
                id: String(item.place_id),
                name: item.display_name,
                lat: Number(item.lat),
                lon: Number(item.lon),
              }))
              .filter(
                (item) =>
                  Number.isFinite(item.lat) && Number.isFinite(item.lon),
              ),
          )
          setJumpError(false)
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setJumpResults([])
          setJumpError(true)
        })
        .finally(() => {
          setJumpLoading(false)
        })
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [showJumpResults, trimmedSearch, i18n.language])

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
          {showJumpResults && (
            <TableRow>
              <TableCell colSpan={2}>
                <Box display="flex" flexDirection="column" gap={1}>
                  {jumpLoading ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <Typography variant="caption">
                        {t('searching')}
                      </Typography>
                    </Box>
                  ) : jumpError ? (
                    <Typography variant="caption" color="error">
                      {t('local_error')}
                    </Typography>
                  ) : jumpResults.length ? (
                    jumpResults.map((result) => (
                      <Button
                        key={result.id}
                        variant="outlined"
                        color="secondary"
                        onClick={() => handleJump(result)}
                        sx={{
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          width: '100%',
                          whiteSpace: 'normal',
                          lineHeight: 1.3,
                          textAlign: 'left',
                        }}
                      >
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            textAlign: 'left',
                            width: '100%',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                          }}
                        >
                          {result.name}
                        </Typography>
                      </Button>
                    ))
                  ) : (
                    <Typography variant="caption">{t('no_options')}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {t('jump_to_areas_attribution')}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
