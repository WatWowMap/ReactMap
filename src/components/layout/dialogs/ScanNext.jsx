import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogTitle, DialogActions, Button, Grid, Typography,
} from '@material-ui/core'
import Axios from 'axios'

import { useStatic, useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanNextTargetMarker from './ScanNextTarget'

export default function Main({
  scanNextMode, setScanNextMode, map, scanNextAreaRestriction,
}) {
  const { data } = scanNextAreaRestriction?.length ? useQuery(Query.scanAreas()) : { data: null }
  const { t } = useTranslation()
  const { loggedIn } = useStatic(state => state.auth)
  const location = useStore(s => s.location)
  const [scanNextLocation, setScanNextLocation] = useState(location)
  const [scanNextCoords, setScanNextCoords] = useState([location])
  const [scanNextType, setScanNextType] = useState('S')

  if (scanNextMode === 'sendCoords') {
    Axios({
      method: 'POST',
      headers: { 'react-map-scanner-secret': 'I need TurtIe\'s help on that' },
      data: {
        username: loggedIn?.username || 'a visitor',
        userId: loggedIn?.id,
        scanNextLocation,
        scanNextCoords,
        scanNextType,
      },
      withCredentials: true,
      url: '/scanNext',
    }).then(res => {
      if (res.data.status === 'ok') {
        setScanNextMode('confirmed')
      } else {
        setScanNextMode('error')
      }
    }).catch(() => {
      setScanNextMode('error')
    })
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
          scanAreas={data ? data.scanAreas[0].features : null}
        />
      )}
      <Dialog
        onClose={() => setScanNextMode(false)}
        open={scanNextMode === 'confirmed'}
        maxWidth="xs"
      >
        <DialogTitle>{t('scan_confirmed_title')}</DialogTitle>
        <DialogContent>
          <Grid
            item
            justify="center"
            align="center"
          >
            <Typography variant="subtitle1" align="center">
              {t('scan_confirmed')}
            </Typography>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanNextMode(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        onClose={() => setScanNextMode(false)}
        open={scanNextMode === 'error'}
        maxWidth="xs"
      >
        <DialogTitle>{t('scan_error_title')}</DialogTitle>
        <DialogContent>
          <Grid
            item
            justify="center"
            align="center"
          >
            <Typography variant="subtitle1" align="center">
              {t('scan_error')}
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
