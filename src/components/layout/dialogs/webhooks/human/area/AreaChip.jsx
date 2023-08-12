// @ts-check
import * as React from 'react'
import Done from '@mui/icons-material/Done'
import Clear from '@mui/icons-material/Clear'
import Chip from '@mui/material/Chip'
import apolloClient from '@services/apollo'
import { setHuman } from '@services/queries/webhook'

import { useStore } from '@hooks/useStore'

import { useWebhookStore } from '../../store'

/** @param {string} areaName */
export const handleClick = (areaName) => () => {
  const { selectedAreas, data } = useWebhookStore.getState()
  const { selectedWebhook } = useStore.getState()
  areaName = areaName.toLowerCase()
  let newAreas = []
  if (areaName === 'all') {
    newAreas = data.available
  } else if (areaName === 'none') {
    newAreas = []
  } else {
    newAreas = selectedAreas.includes(areaName)
      ? selectedAreas.filter((a) => a !== areaName)
      : [...selectedAreas, areaName]
  }
  apolloClient.mutate({
    mutation: setHuman,
    variables: {
      category: 'setAreas',
      data: newAreas,
      name: selectedWebhook,
      status: 'POST',
    },
  })
  useWebhookStore.setState({ selectedAreas: newAreas })
}

const AreaChip = ({ name }) => {
  const selected = useWebhookStore((s) =>
    s.selectedAreas.includes(name.toLowerCase()),
  )
  return (
    <Chip
      label={name}
      clickable
      variant={selected ? 'filled' : 'outlined'}
      deleteIcon={selected ? <Done /> : <Clear />}
      size="small"
      color={selected ? 'secondary' : 'primary'}
      onClick={handleClick(name)}
      onDelete={handleClick(name)}
      style={{ margin: 3 }}
    />
  )
}

export const MemoAreaChip = React.memo(
  AreaChip,
  (prev, next) => prev.name === next.name,
)
