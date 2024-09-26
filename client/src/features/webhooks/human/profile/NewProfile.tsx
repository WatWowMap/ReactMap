// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import { ALL_PROFILES, SET_PROFILE } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

export const NewProfile = () => {
  const { t } = useTranslation()
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })

  const existing = useWebhookStore((s) => s.profile || []).map((x) => x.name)

  const [newProfile, setNewProfile] = React.useState('')
  const [interacted, setInteracted] = React.useState(false)

  const handleAddProfile = React.useCallback(() => {
    setNewProfile('')
    save({
      variables: {
        category: 'profiles-add',
        data: { name: newProfile },
        status: 'POST',
      },
    })
  }, [newProfile, save])

  /** @type {React.FormEventHandler<HTMLFormElement>} */
  const handleSubmit = React.useCallback(
    (event) => {
      event.preventDefault()
      handleAddProfile()
    },
    [handleAddProfile],
  )

  const handleChange = React.useCallback(
    (
      /** @type {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} */ event,
    ) => {
      setNewProfile(event.target.value?.toLowerCase() || '')
    },
    [setNewProfile],
  )

  const invalid = existing.includes(newProfile) || newProfile === 'all'

  return (
    <Grid container xs={12} component="form" onSubmit={handleSubmit}>
      <Grid xs={12} sm={4}>
        <Typography variant="h6" align="center" pb={{ xs: 2, sm: 0 }}>
          {t('add_new_profile')}
        </Typography>
      </Grid>
      <Grid xs={9} sm={5}>
        <TextField
          size="small"
          autoComplete="off"
          label={invalid && interacted ? t('profile_error') : t('profile_name')}
          value={newProfile}
          onChange={handleChange}
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
          disabled={invalid || !newProfile}
        >
          {t('save')}
        </Button>
      </Grid>
    </Grid>
  )
}

export const MemoNewProfile = React.memo(NewProfile, () => true)
