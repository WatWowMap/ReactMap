import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Save from '@mui/icons-material/Save'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { ALL_PROFILES, SET_PROFILE } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

import { handleUpdate } from './handleUpdate'

export const CopyView = ({
  uid,
  handleViewChange,
}: import('./ProfileTile').Props) => {
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })
  const { t } = useTranslation()

  const profiles = useWebhookStore((s) => s.profile)
  const profile = profiles.find((p) => p.uid === uid)

  const [copyTo, setCopyTo] = React.useState(0)

  const handleCopyProfile = () => {
    if (copyTo !== 0) {
      useWebhookStore.setState({ profileLoading: profile.uid })
      handleViewChange('profile')()
      save({
        variables: {
          category: 'profiles-copy',
          data: {
            from: profile.profile_no,
            to: copyTo,
          },
          status: 'POST',
        },
      }).then(handleUpdate)
    }
  }

  if (!profile) return null

  return (
    <>
      <Grid sm={7} xs={8}>
        <Typography align="center" variant="subtitle2">
          {t('confirm_copy', { profile: profile.name })}
        </Typography>
      </Grid>
      <Grid container alignItems="center" justifyContent="center" xs={4}>
        <Grid sm={6} xs={12}>
          <Select
            fullWidth
            value={copyTo || ''}
            onChange={(e) => setCopyTo(+e.target.value)}
          >
            {profiles
              .filter((prof) => profile.profile_no !== prof.profile_no)
              .map((prof) => (
                <MenuItem key={prof.uid} value={prof.profile_no}>
                  {prof.name}
                </MenuItem>
              ))}
          </Select>
        </Grid>
        <Grid sm={6} xs={12}>
          <IconButton size="large" onClick={handleViewChange('profile')}>
            <Clear />
          </IconButton>
          <IconButton
            disabled={profile.profile_no === copyTo}
            size="large"
            onClick={handleCopyProfile}
          >
            <Save />
          </IconButton>
        </Grid>
      </Grid>
    </>
  )
}
