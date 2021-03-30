import { Typography } from '@material-ui/core'
import React from 'react'

export default function SubmissionCellPopup({ cell }) {
  return (
    <>
      <Typography>
        {cell.level}
      </Typography>
      <Typography>
        {cell.id}
      </Typography>
      <Typography>
        {cell.count}
      </Typography>
      <Typography>
        {cell.count_pokestops}
      </Typography>
      <Typography>
        {cell.count_gyms}
      </Typography>
    </>
  )
}
