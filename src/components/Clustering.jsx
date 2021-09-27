import React from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useStatic } from '@hooks/useStore'
import * as index from './tiles/index'
import Notification from './layout/general/Notification'

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
  filters, map, Icons, perms, tileStyle, config, userIcons,
}) {
  const Component = index[category]
  const hideList = useStatic(state => state.hideList)
  const excludeList = useStatic(state => state.excludeList)
  const timerList = useStatic(state => state.timerList)

  const ts = Math.floor((new Date()).getTime() / 1000)
  const currentZoom = map.getZoom()

  const showCircles = userSettings.interactionRanges && currentZoom >= config.interactionRangeZoom

  const finalData = renderedData.map((each) => {
    if (!hideList.includes(each.id)) {
      return (
        <Component
          key={`${getId(category, each)}-${userSettings.clustering}`}
          item={each}
          ts={ts}
          filters={filters}
          map={map}
          config={config}
          showTimer={timerList.includes(each.id)}
          Icons={Icons}
          userIcons={userIcons}
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
  })

  const limitHit = finalData.length > config.clusterZoomLevels.forcedClusterLimit

  return limitHit || (zoomLevel && userSettings.clustering) ? (
    <>
      <MarkerClusterGroup
        key={map.getZoom()}
        disableClusteringAtZoom={limitHit ? 20 : zoomLevel}
        chunkedLoading
      >
        {finalData}
      </MarkerClusterGroup>
      {limitHit && (
        <Notification
          severity="warning"
          i18nKey="clusterLimit"
          messages={[
            {
              key: 'limitHit',
              variables: [category, config.clusterZoomLevels.forcedClusterLimit],
            },
            {
              key: 'zoomIn',
              variables: [],
            },
          ]}
        />
      )}
    </>
  ) : finalData
}
