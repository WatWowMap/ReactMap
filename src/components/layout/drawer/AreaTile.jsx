import React from 'react'
import { Grid, MenuItem, Typography, Checkbox } from '@material-ui/core'
import { useMap } from 'react-leaflet'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

export default function AreaTile({
  name,
  feature,
  childAreas,
  scanAreasZoom,
  allAreas,
  i,
}) {
  const { scanAreas } = useStore((s) => s.filters)
  const setAreas = useStore((s) => s.setAreas)
  const map = useMap()

  if (!scanAreas) return null

  const hasAll =
    childAreas &&
    childAreas.every(
      (c) =>
        c.properties.manual ||
        scanAreas.filter.areas.includes(c.properties.name),
    )
  const hasSome =
    childAreas &&
    childAreas.some((c) => scanAreas.filter.areas.includes(c.properties.name))
  const hasManual =
    feature?.properties?.manual || childAreas.every((c) => c.properties.manual)

  return (
    <Grid
      item
      xs={
        name || (childAreas.length % 2 === 1 && i === childAreas.length - 1)
          ? 12
          : 6
      }
      style={{
        border: `1px solid ${feature?.properties?.color || 'grey'}`,
        backgroundColor: feature?.properties?.fillColor || 'none',
      }}
    >
      <MenuItem
        style={{ height: '100%' }}
        onClick={() => {
          if (feature?.properties?.center) {
            map.flyTo(
              feature.properties.center,
              feature.properties.zoom || scanAreasZoom,
            )
          }
        }}
      >
        <Grid container alignItems="center" justifyContent="center">
          <Grid item xs={name ? 11 : 10} style={{ textAlign: 'center' }}>
            <Typography
              variant={name ? 'h6' : 'caption'}
              align="center"
              style={{ whiteSpace: 'pre-wrap', width: '100%' }}
            >
              {name || feature.properties.name ? (
                Utility.getProperName(
                  name ||
                    feature.properties.formattedName ||
                    feature.properties.name,
                )
              ) : (
                <>&nbsp;</>
              )}
            </Typography>
          </Grid>
          <Grid item xs={name ? 1 : 2} style={{ textAlign: 'right' }}>
            <Checkbox
              size="small"
              indeterminate={name ? hasSome && !hasAll : false}
              checked={
                name
                  ? hasAll
                  : scanAreas.filter.areas.includes(feature.properties.name)
              }
              onChange={() =>
                setAreas(
                  name
                    ? childAreas.map((c) => c.properties.name)
                    : feature.properties.name,
                  allAreas,
                  name ? hasSome : false,
                )
              }
              style={{
                color:
                  !childAreas.length || hasManual || !feature.properties.name
                    ? feature?.properties?.fillColor ||
                      feature?.properties?.fill ||
                      '#212121'
                    : 'none',
              }}
              disabled={
                !childAreas.length || hasManual || !feature.properties.name
              }
            />
          </Grid>
        </Grid>
      </MenuItem>
    </Grid>
  )
}
