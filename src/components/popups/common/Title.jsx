import React from 'react'
import { Typography } from '@material-ui/core'

import { useStore } from '@hooks/useStore'

export default function Title({ mainName, backup }) {
  const popups = useStore((state) => state.popups)
  const setPopups = useStore((state) => state.setPopups)

  const handleClick = () => {
    setPopups({
      ...popups,
      names: !popups.names,
    })
  }
  return (
    <Typography
      variant="subtitle2"
      align="center"
      noWrap={popups.names}
      onClick={handleClick}
    >
      {mainName || backup}
    </Typography>
  )
}
