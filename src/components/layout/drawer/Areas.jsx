import React, { useMemo } from 'react'
import { useMap } from 'react-leaflet'
import { useQuery } from '@apollo/client'
import { Grid, Button, Paper, TextField } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Query from '@services/Query'
import { useStatic, useStore } from '@hooks/useStore'
import AreaTile from './AreaTile'

export default function AreaDropDown() {
  const { data, loading, error } = useQuery(Query.scanAreasMenu())
  const { t } = useTranslation()
  const filters = useStore((s) => s.filters)
  const { setAreas, setFilters } = useStore.getState()
  const { config } = useStatic.getState()
  const map = useMap()

  const allAreas = useMemo(() => {
    if (data?.scanAreasMenu) {
      return data.scanAreasMenu.flatMap((parent) =>
        parent.children
          .filter((child) => !child.properties.manual)
          .map((child) => child.properties.key),
      )
    }
    return []
  }, [data])

  if (loading || error) return null

  return (
    <>
      <Grid
        item
        xs={t('drawer_grid_advanced_width')}
        style={{ textAlign: 'center' }}
      >
        <Button
          onClick={() => setAreas()}
          variant="contained"
          color="primary"
          style={{ minWidth: '80%' }}
        >
          {t('reset')}
        </Button>
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <TextField
          label={t('search')}
          variant="outlined"
          fullWidth
          value={filters?.scanAreas?.filter?.search || ''}
          onChange={(e) =>
            setFilters({
              ...filters,
              scanAreas: {
                ...filters.scanAreas,
                filter: {
                  ...filters.scanAreas.filter,
                  search: e.target.value || '',
                },
              },
            })
          }
        />
      </Grid>
      <Paper
        style={{
          minHeight: 50,
          maxHeight: config.map.scanAreaMenuHeight || 400,
          width: '100%',
          overflow: 'auto',
          backgroundColor: '#212121',
        }}
      >
        {data?.scanAreasMenu
          ?.map((area) => ({
            ...area,
            children: area.children.filter(
              (feature) =>
                filters.scanAreas?.filter?.search === '' ||
                feature.properties?.key
                  ?.toLowerCase()
                  ?.includes(filters?.scanAreas?.filter?.search?.toLowerCase()),
            ),
          }))
          .map(({ name, details, children }) => {
            if (!children.length) return null
            return (
              <Grid
                key={name || ''}
                container
                alignItems="stretch"
                justifyContent="center"
              >
                {name && (
                  <AreaTile
                    key={name}
                    name={name}
                    feature={details}
                    allAreas={allAreas}
                    childAreas={children}
                    scanAreasZoom={config.map.scanAreasZoom}
                    map={map}
                    scanAreas={filters.scanAreas}
                    setAreas={setAreas}
                  />
                )}
                {children.map((feature, i) => (
                  <AreaTile
                    key={feature?.properties?.name || i}
                    feature={feature}
                    allAreas={allAreas}
                    childAreas={children}
                    scanAreasZoom={config.map.scanAreasZoom}
                    i={i}
                    map={map}
                    scanAreas={filters.scanAreas}
                    setAreas={setAreas}
                  />
                ))}
              </Grid>
            )
          })}
      </Paper>
    </>
  )
}
