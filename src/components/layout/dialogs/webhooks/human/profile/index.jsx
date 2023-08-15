// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'

import { useGetWebhookData } from '../../hooks'
import { NewProfile } from './NewProfile'
import { ProfileTile } from './ProfileTile'

/**
 * @typedef {'profile' | 'edit' | 'delete' | 'copy'} View
 * @typedef {{ uid: number, handleViewChange: (newView: View) => () => void}} Props
 */

export default function ProfileEditing() {
  const { data } = useGetWebhookData('profile')

  return (
    <Grid container alignItems="center" justifyContent="center" py={2} px={4}>
      <NewProfile />
      {data.map(({ uid }) => (
        <ProfileTile key={uid} uid={uid} />
      ))}
    </Grid>
  )
}
