import React from 'react'
import { Typography } from '@material-ui/core'

export default function SubmissionCellPopup({ cell }) {
  const gymThreshold = [2, 6, 20]
  let untilNextGym = 'Never'
  if (cell.count_gyms < 3) {
    untilNextGym = `${gymThreshold[cell.count_gyms] - cell.count} Submissions`
  }
  if ((cell.count === 1 && cell.count_gyms < 1)
    || (cell.count === 5 && cell.count_gyms < 2)
    || (cell.count === 19 && cell.count_gyms < 3)) {
    untilNextGym = 'Next Submission!'
  }
  return (
    <>
      <Typography variant="h6" align="center">
        Level {cell.level} S2 Cell
      </Typography>
      <Typography variant="subtitle2" align="center">
        Total Count: {cell.count}
      </Typography>
      <Typography variant="subtitle2" align="center">
        Pokestops: {cell.count_pokestops}
      </Typography>
      <Typography variant="subtitle2" align="center">
        Gyms: {cell.count_gyms}
      </Typography>
      <Typography variant="subtitle2" align="center">
        Next Gym: {untilNextGym}
      </Typography>
    </>
  )
}
