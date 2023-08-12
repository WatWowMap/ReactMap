// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

import { useGetAreas } from '../../hooks'
import { MemoAreaChip } from './AreaChip'

export const AreaGroup = () => {
  const groups = useGetAreas()
  return groups.map(({ group, children }) => (
    <GroupTile key={group} group={group}>
      {children.map((child) => (
        <MemoAreaChip key={`${group}_${child}`} name={child} />
      ))}
    </GroupTile>
  ))
}

const GroupTile = ({ group, children }) => {
  if (children.length === 0) return null
  return (
    <Grid2 xs={12}>
      <Divider style={{ margin: '20px 0' }} />
      <Typography variant="h4" gutterBottom>
        {group}
      </Typography>
      {children}
    </Grid2>
  )
}
