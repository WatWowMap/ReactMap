import * as React from 'react'
import Done from '@mui/icons-material/Done'
import Clear from '@mui/icons-material/Clear'
import Chip from '@mui/material/Chip'
import { useWebhookStore, handleClick } from '@store/useWebhookStore'

const ICON = {
  true: <Done />,
  false: <Clear />,
}

const AreaChip = ({ name }: { name: string }) => {
  const selected = useWebhookStore((s) =>
    s.human.area.includes(name.toLowerCase()),
  )

  return (
    <Chip
      clickable
      color={selected ? 'secondary' : 'primary'}
      deleteIcon={ICON[`${selected}`]}
      label={name}
      size="small"
      style={{ margin: 3 }}
      variant={selected ? 'filled' : 'outlined'}
      onClick={handleClick(name)}
      onDelete={handleClick(name)}
    />
  )
}

export const MemoAreaChip = React.memo(
  AreaChip,
  (prev, next) => prev.name === next.name,
)
