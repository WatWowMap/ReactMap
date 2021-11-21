import React from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useStatic } from '@hooks/useStore'
import * as index from './tiles/index'
import Notification from './layout/general/Notification'

const getId = (component, item) => {
  switch (component) {
    default: return item.id
    case 'devices': return item.uuid
    case 'submissionCells': return component
    case 'nests': return item.nest_id
  }
}
const ignoredClustering = ['devices', 'submissionCells', 's2cells', 'weather']

export default function Clustering({
  category, renderedData, userSettings, clusterZoomLvl, staticUserSettings, params,
  filters, map, Icons, perms, tileStyle, config, userIcons, setParams, isNight,
}) {
  const Component = index[category]
  const hideList = useStatic(state => state.hideList)
  const excludeList = useStatic(state => state.excludeList)
  const timerList = useStatic(state => state.timerList)

  const ts = Math.floor((new Date()).getTime() / 1000)
  const currentZoom = map.getZoom()

  const showCircles = userSettings.interactionRanges && currentZoom >= config.interactionRangeZoom

  const finalData = renderedData.map((each) => {
    const id = getId(category, each)
    if (!hideList.includes(id)) {
      return (
        <Component
          key={`${id}-${userSettings.clustering}`}
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
          setParams={setParams}
          showCircles={showCircles}
          isNight={isNight}
        />
      )
    }
    return null
  })

  const limitHit = finalData.length > config.clusterZoomLevels.forcedClusterLimit
    && !ignoredClustering.includes(category)

  return limitHit || (clusterZoomLvl && userSettings.clustering) ? (
    <>
      <MarkerClusterGroup
        key={`${limitHit}-${userSettings.clustering}-${category}`}
        disableClusteringAtZoom={limitHit ? 20 : clusterZoomLvl}
        chunkedLoading
      >
        {finalData}
      </MarkerClusterGroup>
      {limitHit && (
        <Notification
          severity="warning"
          i18nKey="cluster_limit"
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
