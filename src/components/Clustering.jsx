import * as React from 'react'
import MarkerClusterGroup from 'react-leaflet-cluster'

import { useStatic, useStore } from '@hooks/useStore'
import { useQueryWithTimeout } from '@hooks/useQueryWithTimeout'

import * as index from './tiles/index'
import Notification from './layout/general/Notification'

const ignoredClustering = ['devices', 'submissionCells', 'scanCells', 'weather']

export default function Clustering({
  category,
  value,
  // renderedData,
  // userSettings,
  // clusteringRules,
  // staticUserSettings,
  // params,
  // filters,
  // map,
  // Icons,
  // perms,
  // tileStyle,
  // config,
  // userIcons,
  // setParams,
  // timeOfDay,
  // onlyAreas,
}) {
  const { data, error } = useQueryWithTimeout(category, value)

  const Component = React.useMemo(() => index[category], [])

  const hideList = useStatic((state) => state.hideList)

  if (!data) {
    return process.env.NODE_ENV === 'development' && error ? (
      <Notification
        open
        severity="error"
        i18nKey="server_dev_error_0"
        messages={[
          {
            key: 'error',
            variables: [error?.message],
          },
        ]}
      />
    ) : null
  }

  // const limitHit =
  //   finalData.length > clusteringRules.forcedLimit &&
  //   !ignoredClustering.includes(category)

  return (
    <MarkerClusterGroup
      // key={`${limitHit}-${userSettings.clustering}-${category}`}
      // disableClusteringAtZoom={limitHit ? 20 : clusteringRules.zoomLevel}
      disableClusteringAtZoom={10}
      chunkedLoading
    >
      {data.map((each) => {
        if (!each) return null
        const id = each.id || category
        if (!hideList.includes(id)) {
          return (
            <Component
              key={id}
              {...each}
              // showTimer={timerList.includes(each.id)}
              // ts={ts}
              // filters={filters}
              // map={map}
              // config={config}
              // Icons={Icons}
              // userIcons={userIcons}
              // perms={perms}
              // zoom={currentZoom}
              // tileStyle={tileStyle}
              // // excludeList={excludeList}
              // userSettings={userSettings}
              // staticUserSettings={staticUserSettings}
              // params={params}
              // setParams={setParams}
              // showCircles={showCircles}
              // timeOfDay={timeOfDay}
              // onlyAreas={onlyAreas}
            />
          )
        }
        return null
      })}
    </MarkerClusterGroup>
  )

  return limitHit || (clusteringRules.zoomLevel && userSettings.clustering) ? (
    <>
      <Notification
        open={limitHit}
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
    </>
  ) : (
    finalData
  )
}
