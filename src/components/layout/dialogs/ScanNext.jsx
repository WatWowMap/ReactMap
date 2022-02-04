import React, { useState } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogTitle, DialogActions, Button, Grid, Typography,
} from '@material-ui/core'

import { useStatic, useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanNextTargetMarker from './ScanNextTarget'

export default function Main({
  scanNextMode, setScanNextMode, map, scanNextAreaRestriction,
}) {
  const { data: scanAreas } = scanNextAreaRestriction?.length ? useQuery(Query.scanAreas()) : { data: null }
  const { loggedIn } = useStatic(state => state.auth)
  const { t } = useTranslation()
  const location = useStore(s => s.location)
  const [scanNextLocation, setScanNextLocation] = useState(location)
  const [scanNextCoords, setScanNextCoords] = useState([location])
  const [scanNextType, setScanNextType] = useState('S')
  const [scanNext, { error: scannerError, data: scannerResponse }] = useLazyQuery(Query.scanner(), {
    variables: {
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

  return (
    <>
      {scanNextMode === 'setLocation' && (
        <ScanNextTargetMarker
          map={map}
          setScanNextMode={setScanNextMode}
          scanNextLocation={scanNextLocation}
          setScanNextLocation={setScanNextLocation}
          scanNextCoords={scanNextCoords}
          setScanNextCoords={setScanNextCoords}
          scanNextType={scanNextType}
          setScanNextType={setScanNextType}
          scanNextAreaRestriction={scanNextAreaRestriction}
          scanAreas={scanAreas ? scanAreas[0]?.features : null}
        />
      )}
      <Dialog
        onClose={() => setScanNextMode(false)}
        open={['confirmed', 'loading', 'error'].includes(scanNextMode)}
        maxWidth="xs"
      >
        <DialogTitle>{t(`scan_${scanNextMode}_title`)}</DialogTitle>
        <DialogContent>
          <Grid
            item
            justify="center"
            align="center"
          >
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
