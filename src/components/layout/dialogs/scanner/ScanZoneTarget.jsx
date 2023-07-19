import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  Button,
  ButtonGroup,
  Slider,
  List,
  ListItemText,
  ListItem,
  ListSubheader,
  Divider,
} from '@mui/material'
import { point } from '@turf/helpers'
import destination from '@turf/destination'
import { Circle, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import AdvancedAccordion from '@components/layout/custom/AdvancedAccordion'
import Utility from '@services/Utility'
import fallbackIcon from '@components/markers/fallback'
import {
  InAllowedArea,
  ScanCancel,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
} from './Shared'

const calcScanZoneCoords = (center, radius, spacing, scanZoneSize) => {
  let coords = [center]
  let currentPoint = point([center[1], center[0]])
  const distance = radius * 2 * Math.cos(30 * (Math.PI / 180))
  const bearings = {
    1: 30,
    2: 90,
    3: 150,
    4: 210,
    5: 270,
    6: 330,
  }
  for (let i = 1; i < scanZoneSize + 1; i += 1) {
    let quadrant = 1
    let step = 1
    while (step < 6 * i + 1) {
      currentPoint = destination(
        currentPoint,
        (distance * spacing) / 1000,
        step === 1 ? 330 : bearings[quadrant],
        { units: 'kilometers' },
      )
      coords = coords.concat([
        [
          currentPoint.geometry.coordinates[1],
          currentPoint.geometry.coordinates[0],
        ],
      ])
      quadrant = Math.floor(step / i) + 1
      step += 1
    }
  }
  return coords
}

const RADIUS = {
  pokemon: 70,
  gym: 750,
}

export default function ScanZoneTarget({
  map,
  scannerType,
  queue,
  setScanZoneMode,
  scanZoneLocation,
  setScanZoneLocation,
  scanZoneCoords,
  setScanZoneCoords,
  scanZoneSize,
  setScanZoneSize,
  scanZoneShowScanCount,
  scanZoneShowScanQueue,
  advancedScanZoneOptions,
  scanZoneRadius,
  scanZoneSpacing,
  scanZoneMaxSize,
  scanZoneAreaRestriction,
  scanAreas,
}) {
  const [position, setPosition] = useState(scanZoneLocation)
  const [spacing, setSpacing] = useState(scanZoneSpacing)
  const [radius, setRadius] = useState(scanZoneRadius.pokemon)

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
          setScanZoneLocation([lat, lng])
          setScanZoneCoords(
            calcScanZoneCoords([lat, lng], radius, spacing, scanZoneSize),
          )
          const popup = scanPopupRef.current
          if (popup) {
            popup.openOn(map)
          }
        }
      },
    }),
    [position, scanZoneLocation, scanZoneSize, spacing, radius],
  )

  const handleSizeChange = (_event, newSize) => {
    setScanZoneSize(newSize)
    setScanZoneCoords(calcScanZoneCoords(position, radius, spacing, newSize))
  }

  const handleSpacingChange = (_event, newSpacing) => {
    setSpacing(newSpacing)
    setScanZoneCoords(
      calcScanZoneCoords(position, radius, newSpacing, scanZoneSize),
    )
  }

  const handleRadiusChange = (_event, newRadius) => {
    setRadius(newRadius)
    setScanZoneCoords(
      calcScanZoneCoords(position, newRadius, spacing, scanZoneSize),
    )
  }

  const isInAllowedArea = scanZoneAreaRestriction.length
    ? Utility.checkAreaValidity(position, scanZoneAreaRestriction, scanAreas)
    : true

  useEffect(() => {
    if (scanZoneCoords.length === 1) {
      setScanZoneCoords(
        calcScanZoneCoords(scanZoneLocation, radius, spacing, scanZoneSize),
      )
    }
  }, [scanZoneCoords.length])

  useEffect(() => {
    const marker = scanMarkerRef.current
    if (marker) {
      marker.openPopup()
    }
  }, [])

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
              secondary={t('scan_zone_choose')}
              style={{ textAlign: 'center' }}
            />
            <Divider style={{ margin: '10px 0' }} />
            {scannerType !== 'mad' && (
              <>
                <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                  {t('scan_zone_size')}
                </ListSubheader>
                <ListItem style={{ padding: 0 }}>
                  <Slider
                    name="Size"
                    min={1}
                    max={scanZoneMaxSize}
                    step={1}
                    value={scanZoneSize}
                    onChange={handleSizeChange}
                  />
                </ListItem>
                <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                  {t('scan_zone_range')}
                </ListSubheader>
                <ListItem style={{ padding: 2 }}>
                  <ButtonGroup size="small" fullWidth>
                    {['pokemon', 'gym'].map((item) => (
                      <Button
                        key={item}
                        onClick={() => handleRadiusChange(null, RADIUS[item])}
                        color={
                          RADIUS[item] === radius ? 'primary' : 'secondary'
                        }
                        variant={
                          RADIUS[item] === radius ? 'contained' : 'outlined'
                        }
                      >
                        {t(item)}
                      </Button>
                    ))}
                  </ButtonGroup>
                </ListItem>
                {advancedScanZoneOptions && (
                  <ListItem style={{ padding: '10px 0' }}>
                    <AdvancedAccordion>
                      <List
                        style={{
                          textAlign: 'center',
                          padding: 0,
                        }}
                      >
                        <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                          {t('scan_zone_spacing')}
                        </ListSubheader>
                        <Slider
                          name="Spacing"
                          min={1}
                          max={2}
                          step={0.01}
                          value={spacing}
                          onChange={handleSpacingChange}
                          style={{ margin: 0, padding: 0 }}
                        />
                        <ListSubheader disableSticky style={{ lineHeight: 2 }}>
                          {t('scan_zone_radius')}
                        </ListSubheader>
                        <Slider
                          name="Radius"
                          min={50}
                          max={900}
                          value={radius}
                          onChange={handleRadiusChange}
                          valueLabelDisplay="auto"
                        />
                      </List>
                    </AdvancedAccordion>
                  </ListItem>
                )}
              </>
            )}
            {scanZoneShowScanCount && (
              <ScanRequests amount={scanZoneCoords?.length} />
            )}
            {scanZoneShowScanQueue && <ScanQueue queue={queue} />}
            <Divider style={{ margin: '10px 0' }} />
            <ScanConfirm
              isInAllowedArea={isInAllowedArea}
              setMode={setScanZoneMode}
              areaRestrictions={scanZoneAreaRestriction}
            />
            <InAllowedArea isInAllowedArea={isInAllowedArea} />
            <ScanCancel setMode={setScanZoneMode} />
          </List>
        </Popup>
      </Marker>
      {scanZoneCoords.map((coords) => (
        <Circle
          key={[coords[0], coords[1]]}
          radius={radius}
          center={[coords[0], coords[1]]}
          fillOpacity={0.5}
          pathOptions={{
            color: !isInAllowedArea ? 'rgb(255, 100, 90)' : 'rgb(90, 145, 255)',
          }}
        />
      ))}
    </>
  )
}
