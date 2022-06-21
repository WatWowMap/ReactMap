import React from 'react'
import { useQuery } from '@apollo/client'
import { Grid, Paper, MenuItem, Typography } from '@material-ui/core'
import { useMap } from 'react-leaflet'

import Utility from '@services/Utility'
import Query from '@services/Query'

export default function AreaDropDown({ scanAreaMenuHeight, scanAreasZoom }) {
  const { data, loading, error } = useQuery(Query.scanAreasMenu(), {
    variables: { version: inject.VERSION },
  })
  const map = useMap()

  if (loading || error) return null

  return (
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
          {Boolean(name) && (
            <Grid
              item
              xs={12}
              onClick={
                details
                  ? () => {
                      if (details?.properties) {
                        map.flyTo(
                          details.properties.center,
                          details.properties.zoom || scanAreasZoom,
                        )
                      }
                    }
                  : undefined
              }
              style={{
                border: `1px solid ${details?.properties?.color || 'grey'}`,
                backgroundColor: details?.properties?.fillColor || 'none',
              }}
            >
              <MenuItem disabled={!details}>
                <Typography
                  variant="h6"
                  align="center"
                  style={{ width: '100%' }}
                >
                  {Utility.getProperName(name)}
                </Typography>
              </MenuItem>
            </Grid>
          )}
          {children.map((feat, i) => (
            <Grid
              key={feat.properties.name}
              item
              xs={
                children.length % 2 === 1 && i === children.length - 1 ? 12 : 6
              }
              onClick={() => {
                if (feat.properties?.center) {
                  map.flyTo(
                    feat.properties.center,
                    feat.properties.zoom || scanAreasZoom,
                  )
                }
              }}
              style={{
                border: `1px solid ${feat.properties.color || 'grey'}`,
                backgroundColor: feat.properties.fillColor || 'none',
              }}
            >
              <MenuItem disabled={!feat.properties.name}>
                <Typography
                  variant="subtitle2"
                  align="center"
                  style={{ width: '100%' }}
                >
                  {feat.properties.name ? (
                    Utility.getProperName(feat.properties.name)
                  ) : (
                    <>&nbsp;</>
                  )}
                </Typography>
              </MenuItem>
            </Grid>
          ))}
        </Grid>
      ))}
    </Paper>
  )
}
