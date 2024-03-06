// @ts-check
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
import { allProfiles, setProfile } from '@services/queries/webhook'

import { useWebhookStore } from '@store/useWebhookStore'

/** @param {import('./ProfileTile').Props} props */
export const CopyView = ({ uid, handleViewChange }) => {
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })
  const { t } = useTranslation()

  const profiles = useWebhookStore((s) => s.profile)
  const profile = profiles.find((p) => p.uid === uid)

  const [copyTo, setCopyTo] = React.useState(0)

  const handleCopyProfile = () => {
    if (copyTo !== 0) {
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
      })
    }
  }

  if (!profile) return null
  return (
    <>
      <Grid xs={8} sm={7}>
        <Typography variant="subtitle2" align="center">
          {t('confirm_copy', { profile: profile.name })}
        </Typography>
      </Grid>
      <Grid container xs={4} alignItems="center" justifyContent="center">
        <Grid xs={12} sm={6}>
          <Select
            value={copyTo || ''}
            onChange={(e) => setCopyTo(+e.target.value)}
            fullWidth
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
        <Grid xs={12} sm={6}>
          <IconButton onClick={handleViewChange('profile')} size="large">
            <Clear />
          </IconButton>
          <IconButton
            onClick={handleCopyProfile}
            disabled={profile.profile_no === copyTo}
            size="large"
          >
            <Save />
          </IconButton>
        </Grid>
      </Grid>
    </>
  )
}
