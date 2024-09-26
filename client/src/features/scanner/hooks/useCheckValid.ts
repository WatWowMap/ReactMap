import { useContext, useEffect } from 'react'
import { useQuery } from '@apollo/client'

import { CHECK_VALID_SCAN } from '@services/queries/scanner'

import { ConfigContext } from '../ContextProvider'
import { useScanStore } from './store'

/**
 * Checks the server to see if the scan location is valid, returns a color
 */
export function useCheckValid(mode: import('./store').ScanMode) {
  const { cooldown } = useContext(ConfigContext)
  const skip = useScanStore((s) => !s[`${mode}Mode`])
  const points = useScanStore((s) => s.scanCoords)

  const { data } = useQuery(CHECK_VALID_SCAN, {
    variables: {
      mode,
      points,
    },
    skip,
  })

  useEffect(() => {
    if (data?.checkValidScan) {
      let valid: import('./store').UseScanStore['valid'] = 'none'
      if (data.checkValidScan.every(Boolean)) {
        valid = 'all'
      } else if (data.checkValidScan.some(Boolean)) {
        valid = 'some'
      }
      useScanStore.setState({
        valid,
        validCoords: data.checkValidScan,
        estimatedDelay: data.checkValidScan.filter(Boolean).length * cooldown,
      })
    }
  }, [data])
}
