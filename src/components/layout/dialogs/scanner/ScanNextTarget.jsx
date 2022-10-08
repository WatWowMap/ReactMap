import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Grid, Button, ButtonGroup, Typography } from '@material-ui/core'
import { point, polygon } from '@turf/helpers'
import destination from '@turf/destination'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { Circle, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

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

  const checkAreaValidity = (center) => {
    if (!scanNextAreaRestriction?.length || !scanAreas?.length) return true
    let isValid = false
    if (scanNextAreaRestriction?.length && scanAreas?.length) {
      const testPoint = point([center[1], center[0]])
      scanNextAreaRestriction.map((area) => {
        if (
          scanAreas.some(
            (scanArea) =>
              scanArea.properties.name === area &&
              booleanPointInPolygon(
                testPoint,
                polygon(scanArea.geometry.coordinates),
              ),
          )
        ) {
          isValid = true
        }
        return true
      })
    }
    return isValid
  }

  const { t } = useTranslation()
  const scanMarkerRef = useRef(null)
  const scanPopupRef = useRef(null)
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = scanMarkerRef.current
        if (marker) {
          const { lat, lng } = marker.getLatLng()
          map.flyTo([lat, lng])
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

  const isInAllowedArea = checkAreaValidity(position)

  return (
    <>
      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={position}
        ref={scanMarkerRef}
      >
        <Popup minWidth={90} maxWidth={150} ref={scanPopupRef}>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            direction="column"
            spacing={2}
          >
            <Grid item>
              <Typography variant="subtitle2" align="center">
                {t('scan_next_choose')}
              </Typography>
            </Grid>
            {scannerType === 'rdm' && (
              <Grid item xs={12} style={{ textAlign: 'center' }}>
                <ButtonGroup size="small">
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
              </Grid>
            )}
            <Grid item style={{ textAlign: 'center' }}>
              {scanNextShowScanCount && (
                <Typography variant="body2" style={{ margin: '0px 0px 12px' }}>
                  {`${t('scan_requests')}: ${scanNextCoords?.length}`}
                </Typography>
              )}
              {scanNextShowScanQueue && (
                <Typography variant="body2" style={{ margin: '0px 0px 12px' }}>
                  {`${t('scan_queue')}: ${queue || '...'}`}
                </Typography>
              )}
              <Button
                color="secondary"
                variant="contained"
                disabled={Boolean(
                  scanNextAreaRestriction?.length && !isInAllowedArea,
                )}
                onClick={() => setScanNextMode('sendCoords')}
              >
                {t('click_to_scan')}
              </Button>
            </Grid>
            <Grid item style={{ display: isInAllowedArea ? 'none' : 'block' }}>
              <Typography
                variant="body2"
                align="center"
                style={{ fontStyle: 'italic' }}
              >
                {t('scan_outside_area')}
              </Typography>
            </Grid>
            <Grid item>
              <Button
                align="left"
                size="small"
                onClick={() => setScanNextMode(false)}
              >
                {t('cancel')}
              </Button>
            </Grid>
          </Grid>
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
