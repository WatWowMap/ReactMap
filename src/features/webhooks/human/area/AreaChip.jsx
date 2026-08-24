// @ts-check

import Clear from '@mui/icons-material/Clear'
import Done from '@mui/icons-material/Done'
import Chip from '@mui/material/Chip'
import { handleClick, useWebhookStore } from '@store/useWebhookStore'
import * as React from 'react'

const ICON = {
  true: <Done />,
  false: <Clear />,
}

const AreaChip = ({ name }) => {
  const selected = useWebhookStore((s) =>
    s.human.area.includes(name.toLowerCase()),
  )
  return (
    <Chip
      label={name}
      clickable
      variant={selected ? 'filled' : 'outlined'}
      deleteIcon={ICON[selected]}
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
