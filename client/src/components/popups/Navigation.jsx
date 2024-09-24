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

  return (
    <IconButton
      href={url
        ?.replace(/\{x\}/g, lat.toString())
        .replace(/\{y\}/g, lon.toString())}
      target="_blank"
      rel="noreferrer"
      size={size}
      disabled={!url}
      style={{ color: 'inherit' }}
    >
      <Map />
    </IconButton>
  )
}
