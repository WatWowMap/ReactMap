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

  const stuff = React.useMemo(() => {
    const parents = {}
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
      }
    })
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
      {Object.entries(stuff).map(([parent, { details, children }]) => (
        <Grid
          key={parent}
          container
          alignItems="center"
          justifyContent="center"
        >
          <Grid
            item
            xs={12}
            onClick={
              details
                ? () => {
                    map.flyTo(
                      details.properties.center,
                      details.properties.zoom || scanAreasZoom,
                    )
                  }
                : undefined
            }
          >
            <MenuItem>
              <Typography variant="h6" align="center" style={{ width: '100%' }}>
                {Utility.getProperName(parent)}
              </Typography>
            </MenuItem>
          </Grid>
          {children.map((feat, i) => (
            <Grid
              key={feat.properties.name}
              item
              xs={children.length % 2 === 1 && i === children.length -1 ? 12 : 6}
              onClick={() => {
                map.flyTo(
                  feat.properties.center,
                  feat.properties.zoom || scanAreasZoom,
                )
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
