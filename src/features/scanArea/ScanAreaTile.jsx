// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { GeoJSON } from 'react-leaflet'
import { Polygon } from 'leaflet'

import { useWebhookStore, handleClick } from '@store/useWebhookStore'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { getProperName } from '@utils/strings'
import { getAreaKeys, getValidAreaKeys, migrateLegacyAreaKeys } from './utils'

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
  const accessibleAreaKeys = useMemory(
    (s) => s.auth.perms.areaRestrictions || [],
  )
  const webhook = useWebhookStore((s) => !!s.mode)
  const migratedAreas = React.useMemo(
    () =>
      migrateLegacyAreaKeys(
        featureCollection.features,
        selectedAreas,
        accessibleAreaKeys,
      ),
    [accessibleAreaKeys, featureCollection.features, selectedAreas],
  )
  const effectiveSelectedAreas = migratedAreas || selectedAreas
  const selectionKey = React.useMemo(
    () => [...effectiveSelectedAreas].sort().join(','),
    [effectiveSelectedAreas],
  )
  const orderedFeatureCollection = React.useMemo(
    () => ({
      ...featureCollection,
      // Render grouped parents underneath children so child taps stay reachable.
      features: [...featureCollection.features].sort(
        (a, b) => Number(!!a.properties.parent) - Number(!!b.properties.parent),
      ),
    }),
    [featureCollection],
  )

  return (
    <GeoJSON
      key={`${search}${tapToToggle}${alwaysShowLabels}${selectionKey}`}
      data={orderedFeatureCollection}
      filter={(f) =>
        webhook ||
        search === '' ||
        `${f.properties.key || f.properties.name || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
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
              accessibleAreaKeys,
            )
            const validAreaKeys = getValidAreaKeys(
              featureCollection.features,
              accessibleAreaKeys,
            )
            const { setAreas } = useStorage.getState()
            const hasAll = areaKeys.every((area) =>
              effectiveSelectedAreas.includes(area),
            )
            const legacyGroupKey = layer.feature.properties.parent
              ? featureCollection.features.find(
                  (feature) =>
                    !feature.properties.manual &&
                    !feature.properties.parent &&
                    feature.properties.name ===
                      layer.feature.properties.parent &&
                    feature.properties.key,
                )?.properties.key
              : undefined
            let nextAreaKeys = areaKeys
            let unselectAll = hasAll

            if (legacyGroupKey && selectedAreas.includes(legacyGroupKey)) {
              const siblingAreaKeys = featureCollection.features
                .filter(
                  (feature) =>
                    !feature.properties.manual &&
                    feature.properties.parent ===
                      layer.feature.properties.parent &&
                    feature.properties.key !== layer.feature.properties.key,
                )
                .map((feature) => feature.properties.key)
              nextAreaKeys = [
                legacyGroupKey,
                ...(selectedAreas.includes(layer.feature.properties.key)
                  ? [layer.feature.properties.key]
                  : []),
                ...siblingAreaKeys.filter(
                  (key) => !selectedAreas.includes(key),
                ),
              ]
              unselectAll = false
            } else if (areaKeys.length > 1 && !hasAll) {
              nextAreaKeys = areaKeys.filter(
                (area) => !effectiveSelectedAreas.includes(area),
              )
            }

            layer.setStyle({ fillOpacity: hasAll ? 0.2 : 0.8 })
            setAreas(nextAreaKeys, validAreaKeys, unselectAll)
          }
        },
      }}
      onEachFeature={(feature, layer) => {
        if (feature.properties?.name) {
          const { name } = feature.properties
          const areaKeys = getAreaKeys(
            featureCollection.features,
            feature,
            accessibleAreaKeys,
          )
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
