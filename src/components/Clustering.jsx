import React from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useStatic } from '@hooks/useStore'
import * as index from './tiles/index'

const getId = (component, item) => {
  switch (component) {
    default: return `${item.id}-${item.updated}`
    case 'devices': return `${item.uuid}-${item.last_seen}`
    case 'submissionCells': return component
    case 'nests': return `${item.nest_id}-${item.updated}`
    case 'scanAreas': return item.properties.name
  }
}

export default function Clustering({
  category, renderedData, userSettings, zoomLevel, staticUserSettings, params,
  filters, map, path, availableForms, perms, tileStyle, config,
}) {
  const Component = index[category]
  const hideList = useStatic(state => state.hideList)
  const excludeList = useStatic(state => state.excludeList)
  const timerList = useStatic(state => state.timerList)
  const ts = Math.floor((new Date()).getTime() / 1000)
  const currentZoom = map.getZoom()

  const showCircles = userSettings.interactionRanges && currentZoom >= config.interactionRangeZoom
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={userSettings.clustering ? zoomLevel : 1}
      chunkedLoading
    >
      {renderedData.map((each) => {
        if (!hideList.includes(each.id)) {
          return (
            <Component
              key={getId(category, each)}
              item={each}
              ts={ts}
              filters={filters}
              map={map}
              config={config}
              iconSizes={config.iconSizes[category]}
              showTimer={timerList.includes(each.id)}
              path={path}
              availableForms={availableForms}
              perms={perms}
              zoom={currentZoom}
              tileStyle={tileStyle}
              excludeList={excludeList}
              userSettings={userSettings}
              staticUserSettings={staticUserSettings}
              params={params}
              showCircles={showCircles}
            />
          )
        }
        return null
      })}
    </MarkerClusterGroup>
  )
}
