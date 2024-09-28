import DeleteForever from '@mui/icons-material/DeleteForever'
import MoreTimeIcon from '@mui/icons-material/MoreTime'
import FileCopy from '@mui/icons-material/FileCopy'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { useMemory } from '@store/useMemory'
import { useWebhookStore } from '@store/useWebhookStore'

import { ActiveHourChip } from './ActiveHourChip'

export const ProfileView = ({
  uid,
  handleViewChange,
}: import('./ProfileTile').Props) => {
  const isMobile = useMemory((s) => s.isMobile)
  const profile = useWebhookStore((s) => s.profile.find((p) => p.uid === uid))

  if (!profile) return null

  return (
    <>
      <Grid sm={2} xs={6}>
        <Typography variant="h6">{profile.name}</Typography>
      </Grid>
      {isMobile && (
        <Inputs
          handleViewChange={handleViewChange}
          profileNo={profile.profile_no}
        />
      )}
      <Grid sm={6} xs={12}>
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

const Inputs = ({
  profileNo,
  handleViewChange,
}: Omit<import('./ProfileTile').Props, 'uid'> & { profileNo: number }) => {
  const currentProfileNo = useWebhookStore((s) => s.human.current_profile_no)

  return (
    <Grid sm={4} textAlign="right">
      <IconButton size="large" onClick={handleViewChange('edit')}>
        <MoreTimeIcon />
      </IconButton>
      <IconButton
        disabled={profileNo === currentProfileNo}
        size="large"
        onClick={handleViewChange('delete')}
      >
        <DeleteForever />
      </IconButton>
      <IconButton size="large" onClick={handleViewChange('copy')}>
        <FileCopy />
      </IconButton>
    </Grid>
  )
}
