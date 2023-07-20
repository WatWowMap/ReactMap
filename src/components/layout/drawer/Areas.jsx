import React, { useMemo } from 'react'
import { useMap } from 'react-leaflet'
import { useQuery } from '@apollo/client'
import {
  Grid,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItem,
  Paper,
  TextField,
  useTheme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

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
  const theme = useTheme()

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
      <ListItemButton onClick={() => setAreas()}>
        <ListItemIcon>
          <RestartAltIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('reset')} />
      </ListItemButton>
      <ListItem>
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
      </ListItem>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          minHeight: 50,
          maxHeight: config.map.scanAreaMenuHeight || 400,
          overflow: 'auto',
          maxWidth: 350,
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
                    backgroundColor={theme.palette.background.paper}
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
                    backgroundColor={theme.palette.background.paper}
                  />
                ))}
              </Grid>
            )
          })}
      </Paper>
    </>
  )
}
