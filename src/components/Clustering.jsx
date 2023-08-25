import * as React from 'react'
import MarkerClusterGroup from 'react-leaflet-cluster'

import Notification from './layout/general/Notification'

export default function Clustering({ category, zoomLevel, children, cluster }) {
  return cluster ? (
    <>
      <MarkerClusterGroup disableClusteringAtZoom={zoomLevel} chunkedLoading>
        {children}
      </MarkerClusterGroup>
      <Notification
        open
        severity="warning"
        i18nKey="cluster_limit"
        messages={[
          {
            key: 'limitHit',
            variables: [category, children.length || 0],
          },
          {
            key: 'zoomIn',
            variables: [],
          },
        ]}
      />
    </>
  ) : (
    children
  )
}
