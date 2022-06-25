import React from 'react'
import { useQuery } from '@apollo/client'
import { Grid, Button, Paper } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Query from '@services/Query'
import { useStore } from '@hooks/useStore'
import AreaTile from './AreaTile'

export default function AreaDropDown({ scanAreaMenuHeight, scanAreasZoom }) {
  const { data, loading, error } = useQuery(Query.scanAreasMenu())
  const { t } = useTranslation()
  const setAreas = useStore((s) => s.setAreas)

  const allAreas = React.useMemo(() => {
    if (data?.scanAreasMenu) {
      return data.scanAreasMenu.flatMap((parent) =>
        parent.children.map((child) => child.properties.name),
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
      <Paper
        style={{
          minHeight: 50,
          maxHeight: scanAreaMenuHeight || 400,
          width: '100%',
          overflow: 'auto',
          backgroundColor: '#212121',
        }}
      >
        {data?.scanAreasMenu?.map(({ name, details, children }) => (
          <Grid
            key={name || ''}
            container
            alignItems="center"
            justifyContent="center"
          >
            {name && (
              <AreaTile
                key={name}
                name={name}
                feature={details}
                allAreas={allAreas}
                childAreas={children}
                scanAreasZoom={scanAreasZoom}
              />
            )}
            {children.map((feature, i) => (
              <AreaTile
                key={feature?.properties?.name || i}
                feature={feature}
                allAreas={allAreas}
                childAreas={children}
                scanAreasZoom={scanAreasZoom}
                i={i}
              />
            ))}
          </Grid>
        ))}
      </Paper>
    </>
  )
}
