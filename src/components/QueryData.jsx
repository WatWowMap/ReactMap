import * as React from 'react'

import { useQueryWithTimeout } from '@hooks/useQueryWithTimeout'
import { useStatic } from '@hooks/useStore'

import * as index from './tiles/index'
import Clustering from './Clustering'
import Notification from './layout/general/Notification'

const IGNORE_CLUSTERING = ['devices', 'submissionCells', 'scanCells', 'weather']

export default function QueryData({ category, value }) {
  const { data, error, cluster, zoomLevel } = useQueryWithTimeout(
    category,
    value,
  )
  const Component = React.useMemo(() => index[category], [])

  const hideList = useStatic((state) => new Set(state.hideList))

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

  return (
    <Clustering
      category={category}
      cluster={cluster && !IGNORE_CLUSTERING.includes('category')}
      zoomLevel={zoomLevel}
    >
      {data.map((each) => {
        if (!hideList.has(each.id)) {
          return (
            <Component
              key={each.id}
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
              // excludeList={excludeList}
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
    </Clustering>
  )
}
