// @ts-check
import { useQuery } from '@apollo/client'
import { useScanStore } from '@hooks/useStore'
import { CHECK_VALID_SCAN } from '@services/queries/scanner'
import { useEffect, useState } from 'react'
import { COLORS } from './Shared'

/**
 * Checks the server to see if the scan location is valid, returns a color
 * @param {import('@hooks/useStore').ScanMode} mode
 * @returns
 */
export function useCheckValid(mode) {
  const skip = useScanStore((s) => !s[`${mode}Mode`])
  const center = useScanStore((s) => s.scanLocation)
  const [color, setColor] = useState(
    /** @type {typeof COLORS[keyof typeof COLORS]} */ (COLORS.blue),
  )

  const { data } = useQuery(CHECK_VALID_SCAN, {
    variables: {
      center,
      mode,
    },
    skip,
  })

  useEffect(() => {
    const valid = !!data?.checkValidScan || false
    useScanStore.setState({ valid })
    if (valid) {
      setColor(COLORS.orange)
    } else {
      setColor(COLORS.red)
    }
  }, [data])

  return color
}
