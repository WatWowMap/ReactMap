import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  Button,
  ButtonGroup,
  List,
  ListItemText,
  ListItem,
  Divider,
} from '@material-ui/core'
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { Circle, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import Utility from '@services/Utility'
import fallbackIcon from '@components/markers/fallback'
import {
  InAllowedArea,
  ScanCancel,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
} from './Shared'

const RADIUS_POKEMON = 70
const RADIUS_GYM = 750
const DISTANCE = {
  M: RADIUS_POKEMON * 1.732,
  XL: RADIUS_GYM * 1.732,
}

const calcScanNextCoords = (center, type) => {
  const coords = [center]
  if (type === 'S') return coords
  const start = point([center[1], center[0]])
  const options = { units: 'kilometers' }
  return coords.concat(
    [0, 60, 120, 180, 240, 300].map((bearing) => {
      const [lon, lat] = destination(
        start,
        DISTANCE[type] / 1000,
        bearing,
        options,
      ).geometry.coordinates
      return [lat, lon]
    }),
  )
}

export default function ScanNextTarget({
  map,
  scannerType,
  queue,
  setScanNextMode,
  scanNextLocation,
  setScanNextLocation,
  scanNextCoords,
  setScanNextCoords,
  scanNextType,
  setScanNextType,
  scanNextShowScanCount,
  scanNextShowScanQueue,
  scanNextAreaRestriction,
  scanAreas,
}) {
  const [position, setPosition] = useState(scanNextLocation)

  const { t } = useTranslation()
  const scanMarkerRef = useRef(null)
  const scanPopupRef = useRef(null)
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = scanMarkerRef.current
        if (marker) {
          const { lat, lng } = marker.getLatLng()
          map.panTo([lat, lng])
          setPosition([lat, lng])
          setScanNextLocation([lat, lng])
          setScanNextCoords(calcScanNextCoords([lat, lng], scanNextType))
          const popup = scanPopupRef.current
          if (popup) {
            popup.openOn(map)
          }
        }
      },
    }),
    [position, scanNextLocation, scanNextType],
  )

  useEffect(() => {
    const marker = scanMarkerRef.current
    if (marker) {
      marker.openPopup()
    }
  }, [])

  const isInAllowedArea = scanNextAreaRestriction.length
    ? Utility.checkAreaValidity(position, scanNextAreaRestriction, scanAreas)
    : true

  return (
    <>
      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={position}
        ref={scanMarkerRef}
        icon={fallbackIcon()}
      >
        <Popup minWidth={90} maxWidth={200} ref={scanPopupRef} autoPan={false}>
          <List>
            <ListItemText
              className="no-leaflet-margin"
              secondary={t('scan_next_choose')}
              style={{ textAlign: 'center' }}
            />
            <Divider style={{ margin: '10px 0' }} />
            {scannerType !== 'mad' && (
              <ListItem>
                <ButtonGroup size="small" fullWidth>
                  {['S', 'M', 'XL'].map((item) => (
                    <Button
                      key={item}
                      onClick={() => {
                        setScanNextType(item)
                        setScanNextCoords(calcScanNextCoords(position, item))
                      }}
                      color={item === scanNextType ? 'primary' : 'secondary'}
                      variant={item === scanNextType ? 'contained' : 'outlined'}
                    >
                      {t(item)}
                    </Button>
                  ))}
                </ButtonGroup>
              </ListItem>
            )}
            {scanNextShowScanCount && (
              <ScanRequests amount={scanNextCoords?.length} />
            )}
            {scanNextShowScanQueue && <ScanQueue queue={queue} />}
            <Divider style={{ margin: '10px 0' }} />
            <ScanConfirm
              areaRestrictions={scanNextAreaRestriction}
              setMode={setScanNextMode}
              isInAllowedArea={isInAllowedArea}
            />
            <InAllowedArea isInAllowedArea={isInAllowedArea} />
            <ScanCancel setMode={setScanNextMode} />
          </List>
        </Popup>
      </Marker>
      {scanNextCoords.map((coords) => (
        <Circle
          key={[coords[0], coords[1]]}
          radius={RADIUS_POKEMON}
          center={[coords[0], coords[1]]}
          fillOpacity={0.5}
          pathOptions={{
            color: !isInAllowedArea ? 'rgb(255, 100, 90)' : 'rgb(90, 145, 255)',
          }}
        />
      ))}
      {scanNextType === 'M' ? (
        <Circle
          key={[scanNextCoords[0][0], scanNextCoords[0][1]]}
          radius={RADIUS_GYM + RADIUS_POKEMON}
          center={[scanNextCoords[0][0], scanNextCoords[0][1]]}
          fillOpacity={0.1}
          pathOptions={{
            color: !isInAllowedArea ? 'rgb(255, 100, 90)' : 'rgb(255, 165, 0)',
            fillColor: !isInAllowedArea
              ? 'rgb(255, 100, 90)'
              : 'rgb(255, 165, 0)',
          }}
        />
      ) : (
        scanNextCoords.map((coords) => (
          <Circle
            key={[coords[0], coords[1]]}
            radius={RADIUS_GYM}
            center={[coords[0], coords[1]]}
            fillOpacity={0.1}
            pathOptions={{
              color: !isInAllowedArea
                ? 'rgb(255, 100, 90)'
                : 'rgb(255, 165, 0)',
              fillColor: !isInAllowedArea
                ? 'rgb(255, 100, 90)'
                : 'rgb(255, 165, 0)',
            }}
          />
        ))
      )}
    </>
  )
}
