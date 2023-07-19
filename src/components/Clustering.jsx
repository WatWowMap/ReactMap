import React from 'react'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useStatic } from '@hooks/useStore'
import * as index from './tiles/index'
import Notification from './layout/general/Notification'

const ignoredClustering = ['devices', 'submissionCells', 'scanCells', 'weather']

export default function Clustering({
  category,
  renderedData,
  userSettings,
  clusteringRules,
  staticUserSettings,
  params,
  filters,
  map,
  Icons,
  perms,
  tileStyle,
  config,
  userIcons,
  setParams,
  timeOfDay,
  onlyAreas,
}) {
  const Component = index[category]
  const hideList = useStatic((state) => state.hideList)
  const excludeList = useStatic((state) => state.excludeList)
  const timerList = useStatic((state) => state.timerList)

  const ts = Math.floor(Date.now() / 1000)
  const currentZoom = map.getZoom()

  const showCircles =
    userSettings.interactionRanges && currentZoom >= config.interactionRangeZoom

  const finalData = renderedData.map((each) => {
    if (!each) return null
    const id = each.id || category
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
          timeOfDay={timeOfDay}
          onlyAreas={onlyAreas}
        />
      )
    }
    return null
  })

  const limitHit =
    finalData.length > clusteringRules.forcedLimit &&
    !ignoredClustering.includes(category)

  return limitHit || (clusteringRules.zoomLevel && userSettings.clustering) ? (
    <>
      <MarkerClusterGroup
        key={`${limitHit}-${userSettings.clustering}-${category}`}
        disableClusteringAtZoom={limitHit ? 20 : clusteringRules.zoomLevel}
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
              variables: [category, clusteringRules.forcedLimit],
            },
            {
              key: 'zoomIn',
              variables: [],
            },
          ]}
        />
      )}
    </>
  ) : (
    finalData
  )
}
