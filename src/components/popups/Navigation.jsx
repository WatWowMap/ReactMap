// @ts-check
import * as React from 'react'
import Map from '@mui/icons-material/Map'
import IconButton from '@mui/material/IconButton'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

/**
 * @param {{ lat: number, lon: number, size?: import('@mui/material').IconButtonProps['size'] }} props
 * @returns
 */
export function Navigation({ lat, lon, size = 'large' }) {
  const nav = useStorage((s) => s.settings.navigation)
  const url = useMemory((s) => s.settings.navigation[nav]?.url)

  React.useEffect(() => {
    const navOptions = useMemory.getState().settings.navigation
    if (!url || !(nav in navOptions)) {
      useStorage.setState((prev) => ({
        settings: {
          ...prev.settings,
          navigation: Object.keys(navOptions)[0],
        },
      }))
    }
  }, [url])

  return (
    <IconButton
      href={url
        .replace(/\{x\}/g, lat.toString())
        .replace(/\{y\}/g, lon.toString())}
      target="_blank"
      rel="noreferrer"
      size={size}
      style={{ color: 'inherit' }}
    >
      <Map />
    </IconButton>
  )
}
