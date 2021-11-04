import React from 'react'
import { useQuery } from '@apollo/client'
import {
  Paper, MenuItem, MenuList, Typography,
} from '@material-ui/core'
import center from '@turf/center'
import { useMap } from 'react-leaflet'

import Utility from '@services/Utility'
import Query from '@services/Query'

export default function AreaDropDown({ scanAreasZoom, manualAreas }) {
  const { data } = useQuery(Query.scanAreas())
  const map = useMap()

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
      {Object.keys(manualAreas).length > 0 ? (
        <MenuList>
          {Object.keys(manualAreas).map(area => (
            <MenuItem
              key={area}
              onClick={() => {
                const { lat, lon } = manualAreas[area]
                map.flyTo([lat, lon], scanAreasZoom)
              }}
            >
              <Typography variant="subtitle2" align="center">
                {area}
              </Typography>
            </MenuItem>
          ))}
        </MenuList>
      ) : (
        <MenuList>
          {data && data.scanAreas.features.map(area => (
            <MenuItem
              key={area.properties.name}
              onClick={() => {
                const [lon, lat] = center(area).geometry.coordinates
                map.flyTo([lat, lon], scanAreasZoom)
              }}
            >
              <Typography variant="subtitle2" align="center">
                {Utility.getProperName(area.properties.name)}
              </Typography>
            </MenuItem>
          ))}
        </MenuList>
      )}
    </Paper>
  )
}
