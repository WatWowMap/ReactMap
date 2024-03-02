// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import Save from '@mui/icons-material/Save'
import { Typography, IconButton } from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'

import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { allProfiles, setProfile } from '@services/queries/webhook'

import { useWebhookStore } from '../../store'

/** @param {import('./ProfileTile').Props} props */
export const DeleteView = ({ handleViewChange, uid }) => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const profileNo = useWebhookStore(
    (s) => s.profile.find((p) => p.uid === uid)?.profile_no,
  )

  const handleRemove = () => {
    save({
      variables: {
        category: 'profiles-byProfileNo',
        data: profileNo,
        status: 'DELETE',
      },
    })
  }

  return (
    <>
      <Grid xs={6} sm={8}>
        <Typography variant="subtitle2" align="center">
          {t('confirm_delete')}
        </Typography>
      </Grid>
      <Grid xs={4} sm={2}>
        <IconButton onClick={handleViewChange('profile')} size="large">
          <Clear />
        </IconButton>
        <IconButton onClick={handleRemove} size="large">
          <Save />
        </IconButton>
      </Grid>
    </>
  )
}
