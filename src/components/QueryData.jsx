// @ts-check
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

  if (!data && process.env.NODE_ENV === 'development') {
    return error ? (
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
          return <Component key={each.id || category} {...each} />
        }
        return null
      })}
    </Clustering>
  )
}
