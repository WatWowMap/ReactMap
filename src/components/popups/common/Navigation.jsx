import React from 'react'
import Map from '@mui/icons-material/Map'
import { IconButton } from '@mui/material'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'

export default function Navigation({ lat, lon, size = 'large' }) {
  const nav = useStorage((s) => s.settings.navigation)
  const url = useMemory((s) => s.settings.navigation[nav]?.url)
  return (
    <IconButton
      href={url.replace('{x}', lat).replace('{y}', lon)}
      target="_blank"
      rel="noreferrer"
      size={size}
      style={{ color: 'inherit' }}
    >
      <Map />
    </IconButton>
  )
}
