// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'

import Grid from '@mui/material/Unstable_Grid2'

import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { allProfiles, setProfile } from '@services/queries/webhook'

import { useWebhookStore } from '../../store'

export const NewProfile = () => {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const existing = useWebhookStore(
    (s) => new Set((s.profile || []).map((p) => p.name)),
  )

  const [newProfile, setNewProfile] = React.useState('')
  const [interacted, setInteracted] = React.useState(false)

  const handleAddProfile = () => {
    setNewProfile('')
    save({
      variables: {
        category: 'profiles-add',
        data: { name: newProfile },
        status: 'POST',
      },
    })
  }

  const invalid =
    existing.has(newProfile) || newProfile === 'all' || !newProfile
  return (
    <Grid container xs={12}>
      <Grid xs={12} sm={4}>
        <Typography variant="h6" align="center">
          {t('add_new_profile')}
        </Typography>
      </Grid>
      <Grid xs={7} sm={5}>
        <TextField
          size="small"
          autoComplete="off"
          label={invalid && interacted ? t('profile_error') : t('profile_name')}
          value={newProfile}
          onChange={(event) => setNewProfile(event.target.value?.toLowerCase())}
          variant="outlined"
          error={invalid && interacted}
          onFocus={() => !interacted && setInteracted(true)}
        />
      </Grid>
      <Grid xs={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddProfile}
          disabled={invalid}
        >
          {t('save')}
        </Button>
      </Grid>
    </Grid>
  )
}
