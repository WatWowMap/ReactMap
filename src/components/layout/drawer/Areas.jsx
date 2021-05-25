import React from 'react'
import { useQuery } from '@apollo/client'
import { Paper, MenuItem, MenuList } from '@material-ui/core'
import center from '@turf/center'
import { useMap } from 'react-leaflet'
import Utility from '@services/Utility'
import Query from '@services/Query'

export default function AreaDropDown() {
  const { data } = useQuery(Query.scanAreas())
  const map = useMap()

  return (
    <Paper
      style={{
        height: 250,
        width: '100%',
        overflow: 'auto',
      }}
      elevation={2}
    >
      <MenuList>
        {data && data.scanAreas.map(area => (
          <MenuItem
            key={area.properties.name}
            onClick={() => {
              const [lon, lat] = center(area).geometry.coordinates
              map.flyTo([lat, lon], 15)
            }}
          >
            {Utility.getProperName(area.properties.name)}
          </MenuItem>
        ))}
      </MenuList>
    </Paper>
  )
}
