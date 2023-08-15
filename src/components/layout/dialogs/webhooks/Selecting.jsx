import React from 'react'
import { Grid, Fab, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { setProfile, allProfiles } from '@services/queries/webhook'

import { useWebhookStore, setSelected } from './store'

export default function Selecting() {
  const { t } = useTranslation()
  const [save] = useMutation(setProfile, {
    refetchQueries: [allProfiles],
  })

  const selected = useWebhookStore((s) => s.selected)

  const handleAll = () => {
    const state = useWebhookStore.getState()
    const tracked = state[state.category]

    if (Array.isArray(tracked)) {
      const selectedObj = Object.fromEntries(tracked.map((x) => [x.uid, true]))
      useWebhookStore.setState({ selected: selectedObj })
    }
  }

  const deleteAll = () => {
    const { category } = useWebhookStore.getState()
    save({
      variables: {
        category: `${category}-delete`,
        data: Object.keys(selected).filter((x) => selected[x]),
        status: 'POST',
      },
    })
    setSelected()
  }

  if (!Object.keys(selected).length) return null

  return (
    <Grid container justifyContent="center" alignItems="center">
      <Grid item xs={3} sm={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={() => setSelected()}
        >
          <Typography variant="caption">{t('cancel')}</Typography>
        </Fab>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={handleAll}
        >
          <Typography variant="caption">{t('select_all')}</Typography>
        </Fab>
      </Grid>
      <Grid item xs={5} sm={4} md={3} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={deleteAll}
        >
          <Typography variant="caption">{t('delete_all')}</Typography>
        </Fab>
      </Grid>
    </Grid>
  )
}
