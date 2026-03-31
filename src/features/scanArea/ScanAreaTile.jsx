// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { GeoJSON } from 'react-leaflet'
import { Polygon } from 'leaflet'

import { useWebhookStore, handleClick } from '@store/useWebhookStore'
import { useStorage } from '@store/useStorage'
import { getProperName } from '@utils/strings'

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>} feature
 * @returns {string[]}
 */
function getAreaKeys(features, feature) {
  if (!feature?.properties?.key || feature.properties.manual) return []

  const childKeys =
    !feature.properties.parent && feature.properties.name
      ? features
          .filter(
            (child) =>
              !child.properties.manual &&
              child.properties.parent === feature.properties.name &&
              child.properties.key,
          )
          .map((child) => child.properties.key)
      : []

  return childKeys.length ? childKeys : [feature.properties.key]
}

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @returns {string[]}
 */
function getValidAreaKeys(features) {
  return [
    ...new Set(features.flatMap((feature) => getAreaKeys(features, feature))),
  ]
}

/**
 * @param {Pick<import('@rm/types').RMFeature, 'properties'>[]} features
 * @param {string[]} selectedAreas
 * @returns {string[] | null}
 */
function migrateLegacyAreaKeys(features, selectedAreas) {
  const migrated = new Set(selectedAreas)
  let changed = false

  features.forEach((feature) => {
    if (!feature.properties?.key || !migrated.has(feature.properties.key)) {
      return
    }

    const areaKeys = getAreaKeys(features, feature)
    if (areaKeys.length === 1 && areaKeys[0] === feature.properties.key) {
      return
    }

    migrated.delete(feature.properties.key)
    areaKeys.forEach((area) => migrated.add(area))
    changed = true
  })

  return changed ? [...migrated] : null
}

/**
 *
 * @param {import('@rm/types').RMGeoJSON} featureCollection
 * @returns
 */
function ScanArea(featureCollection) {
  const search = useStorage((s) => s.filters.scanAreas?.filter?.search)
  const selectedAreas = useStorage(
    (s) => s.filters.scanAreas?.filter?.areas || [],
  )
  const tapToToggle = useStorage((s) => s.userSettings.scanAreas.tapToToggle)
  const alwaysShowLabels = useStorage(
    (s) => s.userSettings.scanAreas.alwaysShowLabels,
  )
  const webhook = useWebhookStore((s) => !!s.mode)
  const migratedAreas = React.useMemo(
    () => migrateLegacyAreaKeys(featureCollection.features, selectedAreas),
    [featureCollection.features, selectedAreas],
  )
  const effectiveSelectedAreas = migratedAreas || selectedAreas

  React.useEffect(() => {
    if (!migratedAreas?.length) return

    useStorage.setState((prev) => ({
      filters: {
        ...prev.filters,
        scanAreas: {
          ...prev.filters.scanAreas,
          filter: {
            ...prev.filters.scanAreas?.filter,
            areas: migratedAreas,
          },
        },
      },
    }))
  }, [migratedAreas])

  return (
    <GeoJSON
      key={`${search}${tapToToggle}${alwaysShowLabels}`}
      data={featureCollection}
      filter={(f) =>
        webhook ||
        search === '' ||
        f.properties.key.toLowerCase().includes(search.toLowerCase())
      }
      eventHandlers={{
        click: ({ propagatedFrom: layer }) => {
          if (!layer.feature) return
          const { name, manual = false } = layer.feature.properties
          if (webhook && name && handleClick) {
            handleClick(name)().then((newAreas) => {
              layer.setStyle({
                fillOpacity: newAreas.some(
                  (area) => area.toLowerCase() === name.toLowerCase(),
                )
                  ? 0.8
                  : 0.2,
              })
            })
          } else if (!manual && tapToToggle) {
            const areaKeys = getAreaKeys(
              featureCollection.features,
              layer.feature,
            )
            const validAreaKeys = getValidAreaKeys(featureCollection.features)
            const { filters, setAreas } = useStorage.getState()
            const hasSome = areaKeys.some((area) =>
              filters?.scanAreas?.filter?.areas?.includes(area),
            )
            layer.setStyle({ fillOpacity: hasSome ? 0.2 : 0.8 })
            setAreas(areaKeys, validAreaKeys, hasSome)
          }
        },
      }}
      onEachFeature={(feature, layer) => {
        if (feature.properties?.name) {
          const { name } = feature.properties
          const areaKeys = getAreaKeys(featureCollection.features, feature)
          const isSelected = areaKeys.length
            ? areaKeys.every((area) => effectiveSelectedAreas.includes(area))
            : false
          const popupContent = getProperName(name)
          if (layer instanceof Polygon) {
            layer
              .setStyle({
                color:
                  feature.properties.color ||
                  feature.properties.stroke ||
                  '#3388ff',
                weight: feature.properties['stroke-width'] || 3,
                opacity: feature.properties['stroke-opacity'] || 1,
                fillColor:
                  feature.properties.fillColor ||
                  feature.properties.fill ||
                  '#3388ff',
                fillOpacity: (
                  webhook
                    ? useWebhookStore
                        .getState()
                        .human?.area?.some(
                          (area) => area.toLowerCase() === name?.toLowerCase(),
                        )
                    : isSelected
                )
                  ? 0.8
                  : 0.2,
              })
              .bindTooltip(popupContent, {
                permanent: webhook ? true : alwaysShowLabels,
                direction: 'top',
                className: 'area-tooltip',
              })
            if (alwaysShowLabels) {
              layer.openTooltip()
            }
          }
        }
      }}
    />
  )
}

export const ScanAreaTile = React.memo(
  ScanArea,
  (prev, next) =>
    prev.features.length === next.features.length &&
    prev.features.every(
      (feat, i) => feat.properties.key === next.features[i].properties.key,
    ),
)
