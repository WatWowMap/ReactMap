/* eslint-disable react/jsx-no-useless-fragment */
import React, { useEffect, useState } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { useStore } from '@hooks/useStore'
import Query from '@services/Query'
import ScanNextTarget from './ScanNextTarget'
import ScanZoneTarget from './ScanZoneTarget'

import ScanDialog from './ScanDialog'

export default function ScanOnDemand({
  map,
  scanMode,
  setScanMode,
  scanner: {
    scannerType,
    scanNextShowScanCount,
    scanNextShowScanQueue,
    scanNextAreaRestriction,
    scanZoneShowScanCount,
    scanZoneShowScanQueue,
    advancedScanZoneOptions,
    scanZoneRadius,
    scanZoneSpacing,
    scanZoneMaxSize,
    scanZoneAreaRestriction,
    scanNextCooldown = 0,
    scanZoneCooldown = 0,
  },
  mode,
}) {
  const location = useStore((s) => s.location)

  const [queue, setQueue] = useState('init')
  const [scanLocation, setScanLocation] = useState(location)
  const [scanCoords, setScanCoords] = useState([location])
  const [scanNextType, setScanNextType] = useState('S')
  const [scanZoneSize, setScanZoneSize] = useState(1)

  const { data: scanAreas } = useQuery(Query.scanAreas())
  const [demandScan, { error: scannerError, data: scannerResponse }] =
    useLazyQuery(Query.scanner(), {
      variables: {
        category: mode,
        method: 'GET',
        data: {
          scanLocation,
          scanCoords,
          scanNextType,
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
          type: 'scan_next',
          typeName: mode,
        },
      },
      fetchPolicy: 'no-cache',
    },
  )

  useEffect(() => {
    if (scanMode === 'sendCoords') {
      demandScan()
      setScanMode('loading')
      const timer = mode === 'scanNext' ? scanNextCooldown : scanZoneCooldown
      useStore.setState({
        scannerCooldown:
          (typeof timer === 'number' ? Math.floor(timer) : 0) *
          scanCoords.length,
      })
    }
  }, [scanMode])

  useEffect(() => {
    if (scannerError) {
      setScanMode('error')
    }
    if (scannerResponse) {
      if (scannerResponse?.scanner?.status === 'ok') {
        setScanMode('confirmed')
      } else {
        setScanMode('error')
      }
    }
  }, [!!scannerError, scannerResponse?.scanner?.status])

  useEffect(() => {
    let timer
    if (scanNextShowScanQueue || scanZoneShowScanQueue) {
      if (queue === 'init') {
        getQueue()
        setQueue('...')
      }
      timer = setInterval(() => {
        if (scanMode === 'setLocation') {
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
      {scanMode === 'setLocation' && (
        <>
          {mode === 'scanNext' ? (
            <ScanNextTarget
              map={map}
              scannerType={scannerType}
              queue={queue}
              setScanNextMode={setScanMode}
              scanNextLocation={scanLocation}
              setScanNextLocation={setScanLocation}
              scanNextCoords={scanCoords}
              setScanNextCoords={setScanCoords}
              scanNextType={scanNextType}
              setScanNextType={setScanNextType}
              scanNextShowScanCount={scanNextShowScanCount}
              scanNextShowScanQueue={scanNextShowScanQueue}
              scanNextAreaRestriction={scanNextAreaRestriction}
              scanAreas={scanAreas ? scanAreas.scanAreas[0]?.features : null}
            />
          ) : (
            <ScanZoneTarget
              map={map}
              scannerType={scannerType}
              queue={queue}
              setScanZoneMode={setScanMode}
              scanZoneLocation={scanLocation}
              setScanZoneLocation={setScanLocation}
              scanZoneCoords={scanCoords}
              setScanZoneCoords={setScanCoords}
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
        </>
      )}
      <ScanDialog scanMode={scanMode} setScanMode={setScanMode} />
    </>
  )
}
