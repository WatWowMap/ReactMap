import * as React from 'react'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useStatic, useStore } from '@hooks/useStore'

import Notification from './layout/general/Notification'

const IGNORE_CLUSTERING = ['devices', 'submissionCells', 'scanCells', 'weather']

/**
 *
 * @param {{
 *  category: keyof import('@rm/types').Config['api']['polling'],
 *  children: React.ReactNode[]
 * }} param0
 * @returns
 */
export default function Clustering({ category, children }) {
  const {
    config: {
      clustering: { [category]: clustering },
      general: { minZoom },
    },
  } = useStatic.getState()

  const clusteringRules = clustering || {
    forcedLimit: 10000,
    zoomLevel: minZoom,
  }

  const userCluster = useStore(
    (s) => s.userSettings[category]?.clustering || false,
  )

  const limitHit =
    children.length > clusteringRules.forcedLimit &&
    !IGNORE_CLUSTERING.includes(category)

  return limitHit || (clusteringRules.zoomLevel && userCluster) ? (
    <>
      <MarkerClusterGroup
        disableClusteringAtZoom={limitHit ? 20 : clusteringRules.zoomLevel}
        chunkedLoading
      >
        {children}
      </MarkerClusterGroup>
      <Notification
        open={limitHit}
        severity="warning"
        i18nKey="cluster_limit"
        messages={[
          {
            key: 'limitHit',
            variables: [category, clusteringRules.forcedLimit || 0],
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
