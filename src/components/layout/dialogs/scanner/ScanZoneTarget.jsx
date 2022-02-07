import React, {
  useState, useRef, useMemo, useEffect,
} from 'react'
import {
  Grid, Button, Box, Slider, Typography, Accordion, AccordionSummary, AccordionDetails,
} from '@material-ui/core'
import { ExpandMore } from "@material-ui/icons"
import { withStyles } from '@material-ui/core/styles'
import { point, polygon } from '@turf/helpers'
import destination from '@turf/destination'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { Circle, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

export default function ScanZoneTargetMarker({
  map, scannerType, setScanZoneMode, scanZoneLocation, setScanZoneLocation, scanZoneCoords,
  setScanZoneCoords, scanZoneSize, setScanZoneSize, scanZoneMaxSize, advancedScanZoneOptions,
  scanZoneRadius, scanZoneSpacing, scanZoneAreaRestriction, scanAreas,
}) {
  const [position, setPosition] = useState(scanZoneLocation)
  const [spacing, setSpacing] = useState(scanZoneSpacing)
  const [radius, setRadius] = useState(scanZoneRadius.pokemon)
  const calcScanZoneCoords = (center) => {
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
    const options = { units: 'kilometers' }
    for (let i = 1; i < scanZoneSize + 1; i++) {
      let quadrant = 1
      let step = 1
      while (step < 6 * i + 1) {
        currentPoint = destination(currentPoint, (distance * spacing) / 1000, step === 1 ? 330 : bearings[quadrant], options)
        coords = coords.concat([[currentPoint.geometry.coordinates[1], currentPoint.geometry.coordinates[0]]])
        quadrant = Math.floor(step / i) + 1
        step += 1
      }
    }
    return coords
  }

  const checkAreaValidity = (center) => {
    if (!scanZoneAreaRestriction?.length || !scanAreas?.length) return true
    let isValid = false
    if (scanZoneAreaRestriction?.length && scanAreas?.length) {
      const testPoint = point([center[1], center[0]])
      scanZoneAreaRestriction.map(area => {
        if (scanAreas.some(scanArea => scanArea.properties.name === area
          && booleanPointInPolygon(testPoint, polygon(scanArea.geometry.coordinates)))) {
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
          setScanZoneLocation([lat, lng])
          setScanZoneCoords(calcScanZoneCoords([lat, lng]))
          const popup = scanPopupRef.current
          if (popup) {
            popup.openOn(map)
          }
        }
      },
    }),
    [position, scanZoneLocation, scanZoneSize, spacing, radius],
  )

  useEffect(() => {
    const marker = scanMarkerRef.current
    if (marker) {
      marker.openPopup()
    }
  }, [])

  const handleSizeChange = (event, newSize) => {
    setScanZoneSize(newSize)
    setScanZoneCoords(calcScanZoneCoords(position))
  }

  const handleSpacingChange = (event, newSpacing) => {
    setSpacing(newSpacing)
    setScanZoneCoords(calcScanZoneCoords(position))
  }

  const handleRadiusChange = (event, newRadius) => {
    setRadius(newRadius)
    setScanZoneCoords(calcScanZoneCoords(position))
  }

  const rangeMarks = [{ value: scanZoneRadius.pokemon, label: t('pokemon') }, { value: scanZoneRadius.gym, label: t('gym') }]

  const isInAllowedArea = checkAreaValidity(position)

  if (scanZoneCoords.length === 1) {
    setScanZoneCoords(calcScanZoneCoords(scanZoneLocation))
  }

  const AdvancedAccordion = withStyles({
    root: {
      marginTop: 5,
      border: 'none',
      boxShadow: 'none',
      borderRadius: 5,
      '&:before': {
        display: 'none',
      },
      '&$expanded': {
        marginTop: 5,
      },
    },
    expanded: {},
  })(Accordion);

  const AdvancedAccordionSummary = withStyles({
    root: {
      padding: '0px 5px 0px 8px',
      minHeight: 30,
    },
    content: {
      margin: '8px 0px',
      '&$expanded': {
        margin: '8px 0px',
      },
    },
    expandIcon: {
      padding: 0,
      margin: 0,
    },
    expanded: {},
  })(AccordionSummary)

  return (
    <>
      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={position}
        ref={scanMarkerRef}
      >
        <Popup minWidth={90} maxWidth={200} ref={scanPopupRef}>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            direction="column"
            spacing={2}
          >
            <Grid item>
              <Typography variant="subtitle2" align="center">
                {t('scan_zone_choose')}
              </Typography>
            </Grid>
            {scannerType === 'rdm' && (
              <Grid item xs={12}>
                <Box>
                  <Typography variant="caption" align="left">
                    {t('scan_zone_size')}
                  </Typography>
                  <Slider
                    xs={12}
                    name="Size"
                    min={1}
                    max={scanZoneMaxSize}
                    step={1}
                    value={scanZoneSize}
                    onChange={handleSizeChange}
                    onChangeCommitted={handleSizeChange}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" align="left">
                    {t('scan_zone_range')}
                  </Typography>
                  <Slider
                    xs={12}
                    name="Range"
                    marks={rangeMarks}
                    min={-200}
                    max={1000}
                    step={null}
                    value={radius}
                    onChange={handleRadiusChange}
                    onChangeCommitted={handleRadiusChange}
                    valueLabelDisplay="auto"
                  />
                </Box>
                {advancedScanZoneOptions && (
                  <AdvancedAccordion>
                    <AdvancedAccordionSummary
                      expandIcon={<ExpandMore style={{ color: 'white' }} />}
                    >
                      <Typography variant="caption">
                        {t('advanced')}
                      </Typography>
                    </AdvancedAccordionSummary>
                    <AccordionDetails>
                      <Grid
                        container
                        style={{ width: 200 }}
                        direction="row"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Grid item xs={12} style={{ textAlign: 'center' }}>
                          <Typography variant="caption">
                            {t('scan_zone_spacing')}
                          </Typography>
                          <Slider
                            xs={12}
                            name="Spacing"
                            min={1}
                            max={2}
                            step={0.01}
                            value={spacing}
                            onChange={handleSpacingChange}
                            onChangeCommitted={handleSpacingChange}
                            valueLabelDisplay="auto"
                          />
                          <Typography variant="caption">
                            {t('scan_zone_radius')}
                          </Typography>
                          <Slider
                            xs={12}
                            name="Radius"
                            min={50}
                            max={900}
                            value={radius}
                            onChange={handleRadiusChange}
                            onChangeCommitted={handleRadiusChange}
                            valueLabelDisplay="auto"
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </AdvancedAccordion>
                )}
              </Grid>
            )}
            <Grid item>
              <Button
                color="secondary"
                variant="contained"
                disabled={scanZoneAreaRestriction?.length && !isInAllowedArea}
                onClick={() => setScanZoneMode('sendCoords')}
              >
                {t('click_to_scan')}
              </Button>
            </Grid>
            <Grid item style={{ display: isInAllowedArea ? 'none' : 'block' }}>
              <Typography variant="body2" align="center" style={{ fontStyle: 'italic' }}>
                {t('scan_outside_area')}
              </Typography>
            </Grid>
            <Grid item>
              <Button
                align="left"
                size="small"
                onClick={() => setScanZoneMode(false)}
              >
                {t('cancel')}
              </Button>
            </Grid>
          </Grid>
        </Popup>
      </Marker>
      {scanZoneCoords.map(coords => (
        <Circle radius={radius} center={[coords[0], coords[1]]} fillOpacity={0.5} pathOptions={{ color: !isInAllowedArea ? 'rgb(255, 100, 90)' : 'rgb(90, 145, 255)' }} />
      ))}
    </>
  )
}
