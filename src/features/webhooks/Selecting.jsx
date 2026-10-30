// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Fab from '@mui/material/Fab'
import Slide from '@mui/material/Slide'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { apolloClient } from '@services/apollo'
import * as webhookNodes from '@services/queries/webhook'
import {
  useWebhookStore,
  setSelected,
  applyWebhookResult,
  showWebhookError,
} from '@store/useWebhookStore'

export function Selecting() {
  const { t } = useTranslation()
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
    apolloClient
      .mutate({
        mutation: webhookNodes[category.toUpperCase()],
        variables: {
          category: `${category}-delete`,
          data: Object.keys(selected).filter((x) => selected[x]),
          status: 'POST',
        },
        refetchQueries: [webhookNodes.ALL_PROFILES],
      })
      .then(({ data }) => applyWebhookResult(category, data?.webhook))
      .catch(showWebhookError)
    setSelected()()
  }

  return (
    <Slide
      in={Object.values(selected).some(Boolean)}
      direction="up"
      mountOnEnter
      unmountOnExit
    >
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        position="absolute"
        mx="auto"
        width="100%"
        bottom={70}
        left={0}
        right={0}
      >
        <Grid xs={3} sm={2} textAlign="center">
          <Fab
            size="small"
            color="secondary"
            variant="extended"
            onClick={setSelected()}
          >
            <Typography variant="caption">{t('cancel')}</Typography>
          </Fab>
        </Grid>
        <Grid xs={4} sm={3} md={2} textAlign="center">
          <Fab
            size="small"
            color="secondary"
            variant="extended"
            onClick={handleAll}
          >
            <Typography variant="caption">{t('select_all')}</Typography>
          </Fab>
        </Grid>
        <Grid xs={5} sm={4} md={3} textAlign="center">
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
    </Slide>
  )
}
