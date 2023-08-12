// @ts-check
import { useQuery } from '@apollo/client'
import { useScanStore } from '@hooks/useStore'
import { CHECK_VALID_SCAN } from '@services/queries/scanner'
import { useContext, useEffect } from 'react'
import { ConfigContext } from './ContextProvider'

/**
 * Checks the server to see if the scan location is valid, returns a color
 * @param {import('@hooks/useStore').ScanMode} mode
 * @returns
 */
export function useCheckValid(mode) {
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
      /** @type {import('@hooks/useStore').UseScanStore['valid']} */
      let valid = 'none'
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
