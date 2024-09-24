// @ts-check
import * as React from 'react'
import { useMap, GeoJSON } from 'react-leaflet'
import Supercluster from 'supercluster'
import { marker, divIcon, point } from 'leaflet'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Notification } from '@components/Notification'

const IGNORE_CLUSTERING = new Set([
  'devices',
  'submissionCells',
  'scanCells',
  'weather',
])

/**
 *
 * @param {import('geojson').Feature<import('geojson').Point>} feature
 * @param {import('leaflet').LatLng} latlng
 * @returns
 */
function createClusterIcon(feature, latlng) {
  if (!feature.properties.cluster) return null

  const count = feature.properties.point_count
  const size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large'
  const icon = divIcon({
    html: `<div><span>${feature.properties.point_count_abbreviated}</span></div>`,
    className: `marker-cluster marker-cluster-${size}`,
    iconSize: point(40, 40),
  })
  return marker(latlng, { icon })
}

/**
 *
 * @param {{
 *  category: keyof import('@rm/types').Config['api']['polling'],
 *  children: React.ReactElement<{ lat: number, lon: number }>[]
 * }} props
 * @returns
 */
export function Clustering({ category, children }) {
  /** @type {ReturnType<typeof React.useRef<import('leaflet').GeoJSON>>} */
  const featureRef = React.useRef(null)

  const map = useMap()
  const userCluster = useStorage(
    (s) => s.userSettings[category]?.clustering || false,
  )
  const {
    config: {
      clustering,
      general: { minZoom: configMinZoom },
    },
  } = useMemory.getState()

  const [rules] = React.useState(
    category in clustering
      ? clustering[category]
      : {
          forcedLimit: 10000,
          zoomLevel: configMinZoom,
        },
  )
  const [markers, setMarkers] = React.useState(new Set())
  const [superCluster, setSuperCluster] = React.useState(
    /** @type {InstanceType<typeof Supercluster> | null} */ (null),
  )
  const [limitHit, setLimitHit] = React.useState(
    children.length > rules.forcedLimit && !IGNORE_CLUSTERING.has(category),
  )

  React.useEffect(() => {
    setLimitHit(
      children.length > rules.forcedLimit && !IGNORE_CLUSTERING.has(category)
        ? !!rules.forcedLimit
        : false,
    )
  }, [category, userCluster, rules.forcedLimit, children.length])

  React.useEffect(() => {
    if (limitHit || userCluster) {
      setSuperCluster(
        new Supercluster({
          radius: 60,
          extent: 256,
          maxZoom: rules.zoomLevel,
          minPoints: category === 'pokemon' ? 7 : 5,
        }),
      )
    } else {
      setSuperCluster(null)
    }
  }, [rules.zoomLevel, limitHit, userCluster, category])

  React.useEffect(() => {
    if (superCluster) {
      /** @type {import('geojson').Feature<import('geojson').Point>[]} */
      const features = children.filter(Boolean).map((reactEl) => ({
        type: 'Feature',
        id: reactEl?.key,
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [reactEl.props.lon, reactEl.props.lat],
        },
      }))

      superCluster.load(features)

      const bounds = map.getBounds()
      /** @type {[number, number, number, number]} */
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]
      const zoom = map.getZoom()

      const rawClusters = superCluster.getClusters(bbox, zoom)

      const newClusters = []
      const newMarkers = new Set()
      for (let i = 0; i < rawClusters.length; i += 1) {
        const cluster = rawClusters[i]
        if (cluster.properties.cluster) {
          newClusters.push(cluster)
        } else {
          newMarkers.add(cluster.id)
        }
      }
      // @ts-ignore
      featureRef?.current?.addData(newClusters)
      setMarkers(newMarkers)
    } else {
      setMarkers(new Set())
    }
    return () => {
      featureRef.current?.clearLayers()
    }
  }, [children, featureRef, superCluster])

  return (
    <>
      <GeoJSON ref={featureRef} data={null} pointToLayer={createClusterIcon} />
      {children.length > rules.forcedLimit || userCluster
        ? children.filter((x) => x && markers.has(x.key))
        : children}
      {limitHit && (
        <Notification
          open={!!limitHit}
          severity="warning"
          i18nKey="cluster_limit"
          messages={[
            {
              key: 'limitHit',
              variables: [category, rules.forcedLimit.toString()],
            },
            {
              key: 'zoomIn',
              variables: [],
            },
          ]}
        />
      )}
    </>
  )
}
