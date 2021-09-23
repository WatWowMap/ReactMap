import React from 'react'
import { IconButton } from '@material-ui/core'
import { Map } from '@material-ui/icons'

import { useStore, useStatic } from '@hooks/useStore'

export default function Navigation({ lat, lon }) {
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)
  return (
    <IconButton
      href={url.replace('{x}', lat).replace('{y}', lon)}
      target="_blank"
      rel="noreferrer"
    >
      <Map style={{ color: 'white' }} />
    </IconButton>
  )
}
