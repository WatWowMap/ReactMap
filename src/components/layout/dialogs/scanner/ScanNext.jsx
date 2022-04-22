import React, { useEffect, useState } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogTitle, DialogActions, Button, Grid, Typography,
} from '@material-ui/core'

import { useStatic, useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanNextTarget from './ScanNextTarget'

export default function ScanNext({
  map, scanNextMode, setScanNextMode,
  scanner: { scannerType, scanNextShowScanCount, scanNextShowScanQueue, scanNextAreaRestriction },
}) {
  const { data: scanAreas } = scanNextAreaRestriction?.length ? useQuery(Query.scanAreas()) : { data: null }
  const { loggedIn } = useStatic(state => state.auth)
  const { t } = useTranslation()
  const location = useStore(s => s.location)
  const [queue, setQueue] = useState('init')
  const [scanNextLocation, setScanNextLocation] = useState(location)
  const [scanNextCoords, setScanNextCoords] = useState([location])
  const [scanNextType, setScanNextType] = useState('S')
  const [scanNext, { error: scannerError, data: scannerResponse }] = useLazyQuery(Query.scanner(), {
    variables: {
      version: inject.VERSION,
      category: 'scanNext',
      method: 'GET',
      data: {
        username: loggedIn?.username || 'a visitor',
        userId: loggedIn?.id,
        scanNextLocation,
        scanNextCoords,
        scanNextType,
      },
    },
    fetchPolicy: 'no-cache',
  })
  const [getQueue, { data: scannerQueueResponse }] = useLazyQuery(Query.scanner(), {
    variables: {
      version: inject.VERSION,
      category: 'getQueue',
      method: 'GET',
      data: {
        username: loggedIn?.username || 'a visitor',
        userId: loggedIn?.id,
        type: 'scan_next',
        typeName: 'scanNext',
      },
    },
    fetchPolicy: 'no-cache',
  })

  if (scanNextMode === 'sendCoords') {
    scanNext()
    setScanNextMode('loading')
  }
  if (scannerError) {
    setScanNextMode('error')
  }
  if (scannerResponse) {
    if (scannerResponse.scanner?.status === 'ok') {
      setScanNextMode('confirmed')
    } else {
      setScanNextMode('error')
    }
  }

  if (scanNextShowScanQueue) {
    if (queue === 'init') {
      getQueue()
      setQueue('...')
    }
    useEffect(() => {
      const timer = setInterval(() => {
        if (scanNextMode === 'setLocation') {
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
      {scanNextMode === 'setLocation' && (
        <ScanNextTarget
          map={map}
          scannerType={scannerType}
          queue={queue}
          setScanNextMode={setScanNextMode}
          scanNextLocation={scanNextLocation}
          setScanNextLocation={setScanNextLocation}
          scanNextCoords={scanNextCoords}
          setScanNextCoords={setScanNextCoords}
          scanNextType={scanNextType}
          setScanNextType={setScanNextType}
          scanNextShowScanCount={scanNextShowScanCount}
          scanNextShowScanQueue={scanNextShowScanQueue}
          scanNextAreaRestriction={scanNextAreaRestriction}
          scanAreas={scanAreas ? scanAreas.scanAreas[0]?.features : null}
        />
      )}
      <Dialog
        onClose={() => setScanNextMode(false)}
        open={['confirmed', 'loading', 'error'].includes(scanNextMode)}
        maxWidth="xs"
      >
        <DialogTitle>{t(`scan_${scanNextMode}_title`)}</DialogTitle>
        <DialogContent>
          <Grid item style={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" align="center">
              {t(`scan_${scanNextMode}`)}
            </Typography>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanNextMode(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
