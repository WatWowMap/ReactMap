import React, { useEffect, useState } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { useStatic, useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanNextTarget from './ScanNextTarget'
import ScanDialog from './ScanDialog'

export default function ScanNext({
  map,
  scanNextMode,
  setScanNextMode,
  scanner: {
    scannerType,
    scanNextShowScanCount,
    scanNextShowScanQueue,
    scanNextAreaRestriction,
  },
}) {
  const { loggedIn } = useStatic((state) => state.auth)

  const location = useStore((s) => s.location)

  const [queue, setQueue] = useState('init')
  const [scanNextLocation, setScanNextLocation] = useState(location)
  const [scanNextCoords, setScanNextCoords] = useState([location])
  const [scanNextType, setScanNextType] = useState('S')

  const { data: scanAreas } = useQuery(Query.scanAreas())
  const [scanNext, { error: scannerError, data: scannerResponse }] =
    useLazyQuery(Query.scanner(), {
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
          typeName: 'scanNext',
        },
      },
      fetchPolicy: 'no-cache',
    },
  )

  useEffect(() => {
    if (scanNextMode === 'sendCoords') {
      scanNext()
      setScanNextMode('loading')
    }
  }, [scanNextMode])

  useEffect(() => {
    if (scannerError) {
      setScanNextMode('error')
    }
    if (scannerResponse) {
      if (scannerResponse?.scanner?.status === 'ok') {
        setScanNextMode('confirmed')
      } else {
        setScanNextMode('error')
      }
    }
  }, [scannerError, !!scannerResponse])

  useEffect(() => {
    let timer
    if (scanNextShowScanQueue) {
      if (queue === 'init') {
        getQueue()
        setQueue('...')
      }
      timer = setInterval(() => {
        if (scanNextMode === 'setLocation') {
          getQueue()
        }
      }, 2000)
    }
    return () => (timer ? clearInterval(timer) : null)
  })

  useEffect(() => {
    if (scannerQueueResponse?.scanner?.status === 'ok') {
      setQueue(scannerQueueResponse.scanner.message)
      scannerQueueResponse.scanner = {}
    }
  }, [!!scannerQueueResponse?.scanner])

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
      <ScanDialog scanMode={scanNextMode} setScanMode={setScanNextMode} />
    </>
  )
}
