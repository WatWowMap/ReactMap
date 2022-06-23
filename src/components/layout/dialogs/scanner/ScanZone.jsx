import React, { useEffect, useState } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Grid,
  Typography,
} from '@material-ui/core'

import { useStatic, useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanZoneTarget from './ScanZoneTarget'

export default function ScanZone({
  map,
  theme,
  scanZoneMode,
  setScanZoneMode,
  scanner: {
    scannerType,
    scanZoneShowScanCount,
    scanZoneShowScanQueue,
    advancedScanZoneOptions,
    scanZoneRadius,
    scanZoneSpacing,
    scanZoneMaxSize,
    scanZoneAreaRestriction,
  },
}) {
  const { data: scanAreas } = scanZoneAreaRestriction?.length
    ? useQuery(Query.scanAreas())
    : { data: null }
  const { loggedIn } = useStatic((state) => state.auth)
  const { t } = useTranslation()
  const location = useStore((s) => s.location)
  const [queue, setQueue] = useState('init')
  const [scanZoneLocation, setScanZoneLocation] = useState(location)
  const [scanZoneCoords, setScanZoneCoords] = useState([location])
  const [scanZoneSize, setScanZoneSize] = useState(1)
  const [scanZone, { error: scannerError, data: scannerResponse }] =
    useLazyQuery(Query.scanner(), {
      variables: {
        category: 'scanZone',
        method: 'GET',
        data: {
          username: loggedIn?.username || 'a visitor',
          userId: loggedIn?.id,
          scanZoneLocation,
          scanZoneCoords,
          scanZoneSize,
        },
      },
      fetchPolicy: 'no-cache',
    })
  const [getQueue, { data: scannerQueueResponse }] = useLazyQuery(
    Query.scanner(),
    {
      variables: {
        category: 'getQueue',
        method: 'GET',
        data: {
          username: loggedIn?.username || 'a visitor',
          userId: loggedIn?.id,
          type: 'scan_next',
          typeName: 'scanZone',
        },
      },
      fetchPolicy: 'no-cache',
    },
  )

  if (scanZoneMode === 'sendCoords') {
    scanZone()
    setScanZoneMode('loading')
  }
  if (scannerError) {
    setScanZoneMode('error')
  }
  if (scannerResponse) {
    if (scannerResponse.scanner?.status === 'ok') {
      setScanZoneMode('confirmed')
    } else {
      setScanZoneMode('error')
    }
  }

  if (scanZoneShowScanQueue) {
    if (queue === 'init') {
      getQueue()
      setQueue('...')
    }
    useEffect(() => {
      const timer = setInterval(() => {
        if (scanZoneMode === 'setLocation') {
          getQueue()
        }
      }, 2000)
      return () => clearInterval(timer)
    })
  }
  if (scannerQueueResponse && scannerQueueResponse.scanner?.status === 'ok') {
    setQueue(scannerQueueResponse.scanner.message)
    scannerQueueResponse.scanner = {}
  }

  return (
    <>
      {scanZoneMode === 'setLocation' && (
        <ScanZoneTarget
          map={map}
          theme={theme}
          scannerType={scannerType}
          queue={queue}
          setScanZoneMode={setScanZoneMode}
          scanZoneLocation={scanZoneLocation}
          setScanZoneLocation={setScanZoneLocation}
          scanZoneCoords={scanZoneCoords}
          setScanZoneCoords={setScanZoneCoords}
          scanZoneSize={scanZoneSize}
          setScanZoneSize={setScanZoneSize}
          scanZoneShowScanCount={scanZoneShowScanCount}
          scanZoneShowScanQueue={scanZoneShowScanQueue}
          advancedScanZoneOptions={advancedScanZoneOptions}
          scanZoneRadius={scanZoneRadius}
          scanZoneSpacing={scanZoneSpacing}
          scanZoneMaxSize={scanZoneMaxSize}
          scanZoneAreaRestriction={scanZoneAreaRestriction}
          scanAreas={scanAreas ? scanAreas.scanAreas[0]?.features : null}
        />
      )}
      <Dialog
        onClose={() => setScanZoneMode(false)}
        open={['confirmed', 'loading', 'error'].includes(scanZoneMode)}
        maxWidth="xs"
      >
        <DialogTitle>{t(`scan_${scanZoneMode}_title`)}</DialogTitle>
        <DialogContent>
          <Grid item style={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" align="center">
              {t(`scan_${scanZoneMode}`)}
            </Typography>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanZoneMode(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
