import React from 'react'
import { useQuery } from '@apollo/client'
import { Grid, Paper, MenuItem, Typography } from '@material-ui/core'
import { useMap } from 'react-leaflet'

import Utility from '@services/Utility'
import Query from '@services/Query'

export default function AreaDropDown({ scanAreasZoom }) {
  const { data, loading, error } = useQuery(Query.scanAreas(), {
    variables: { version: inject.VERSION },
  })
  const map = useMap()

  if (loading || error) return null

  const areas = React.useMemo(() => {
    const parents = { '': { children: [] } }
    data.scanAreas[0].features.forEach((feature) => {
      if (feature.properties.parent && !parents[feature.properties.parent]) {
        parents[feature.properties.parent] = {
          details: data.scanAreas[0].features.find(
            (area) => area.properties.name === feature.properties.parent,
          ),
          children: data.scanAreas[0].features.filter(
            (area) => area.properties.parent === feature.properties.parent,
          ),
        }
      } else {
        parents[''].children.push(feature)
      }
    })
    if (!Object.keys(parents).length) {
      parents[''] = { children: data.scanAreas[0].features }
    }
    return parents
  }, [])

  return (
    <Paper
      style={{
        minHeight: 50,
        maxHeight: 250,
        width: '100%',
        overflow: 'auto',
        backgroundColor: '#212121',
      }}
    >
      {Object.entries(areas).map(([parent, { details, children }]) => (
        <Grid
          key={parent}
          container
          alignItems="center"
          justifyContent="center"
        >
          {Boolean(parent) && (
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
              <MenuItem>
                <Typography
                  variant="h6"
                  align="center"
                  style={{ width: '100%' }}
                >
                  {Utility.getProperName(parent)}
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
                map.flyTo(
                  feat.properties.center,
                  feat.properties.zoom || scanAreasZoom,
                )
              }}
              style={{
                border: `1px solid ${feat.properties.color || 'grey'}`,
                backgroundColor: feat.properties.fillColor || 'none',
              }}
            >
              <MenuItem>
                <Typography
                  variant="subtitle2"
                  align="center"
                  style={{ width: '100%' }}
                >
                  {Utility.getProperName(feat.properties.name)}
                </Typography>
              </MenuItem>
            </Grid>
          ))}
        </Grid>
      ))}
    </Paper>
  )
}
