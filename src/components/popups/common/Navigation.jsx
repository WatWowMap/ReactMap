import React from 'react'
import Map from '@mui/icons-material/Map'
import { IconButton } from '@mui/material'

import { useStore, useStatic } from '@hooks/useStore'

export default function Navigation({ lat, lon }) {
  const { navigation } = useStore((state) => state.settings)
  const {
    navigation: {
      [navigation]: { url },
    },
  } = useStatic.getState().config

  return (
    <IconButton
      href={url.replace('{x}', lat).replace('{y}', lon)}
      target="_blank"
      rel="noreferrer"
      size="large"
    >
      <Map />
    </IconButton>
  )
}
