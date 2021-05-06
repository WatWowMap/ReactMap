import { Typography } from '@material-ui/core'
import React from 'react'

export default function SubmissionCellPopup({ cell }) {
  return (
    <>
      <Typography>
        Level {cell.level}
      </Typography>
      <Typography>
        ID {cell.id}
      </Typography>
      <Typography>
        Total {cell.count}
      </Typography>
      <Typography>
        Stops {cell.count_pokestops}
      </Typography>
      <Typography>
        Gyms {cell.count_gyms}
      </Typography>
    </>
  )
}
