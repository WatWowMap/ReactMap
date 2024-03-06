// @ts-check
import * as React from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import MoreTimeIcon from '@mui/icons-material/MoreTime'
import FileCopy from '@mui/icons-material/FileCopy'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

import { useMemory } from '@store/useMemory'

import { useWebhookStore } from '@store/useWebhookStore'
import { ActiveHourChip } from './ActiveHourChip'

/** @param {import('./ProfileTile').Props} props */
export const ProfileView = ({ uid, handleViewChange }) => {
  const isMobile = useMemory((s) => s.isMobile)
  const profile = useWebhookStore((s) => s.profile.find((p) => p.uid === uid))

  if (!profile) return null
  return (
    <>
      <Grid xs={6} sm={2}>
        <Typography variant="h6">{profile.name}</Typography>
      </Grid>
      {isMobile && (
        <Inputs
          handleViewChange={handleViewChange}
          profileNo={profile.profile_no}
        />
      )}
      <Grid xs={12} sm={6}>
        {profile.active_hours.map((schedule) => (
          <ActiveHourChip key={schedule.id} uid={uid} {...schedule} />
        ))}
      </Grid>
      {!isMobile && (
        <Inputs
          handleViewChange={handleViewChange}
          profileNo={profile.profile_no}
        />
      )}
    </>
  )
}

/** @param {Omit<import('./ProfileTile').Props, 'uid'> & { profileNo: number }} props */
const Inputs = ({ profileNo, handleViewChange }) => {
  const currentProfileNo = useWebhookStore((s) => s.human.current_profile_no)

  return (
    <Grid sm={4} textAlign="right">
      <IconButton onClick={handleViewChange('edit')} size="large">
        <MoreTimeIcon />
      </IconButton>
      <IconButton
        onClick={handleViewChange('delete')}
        disabled={profileNo === currentProfileNo}
        size="large"
      >
        <DeleteForever />
      </IconButton>
      <IconButton onClick={handleViewChange('copy')} size="large">
        <FileCopy />
      </IconButton>
    </Grid>
  )
}
