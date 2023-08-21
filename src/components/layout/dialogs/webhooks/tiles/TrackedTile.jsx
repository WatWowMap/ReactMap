import React, { useState } from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Edit from '@mui/icons-material/Edit'
import {
  Grid,
  Typography,
  IconButton,
  Dialog,
  Checkbox,
  Box,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import Poracle from '@services/Poracle'
import WebhookAdvanced from '@components/layout/dialogs/webhooks/WebhookAdv'
import { useStatic } from '@hooks/useStore'
import apolloClient, { apolloCache } from '@services/apollo'
import * as webhookNodes from '@services/queries/webhook'

import { useWebhookStore, setSelected } from '../store'

export default function TrackedTile({ index }) {
  const [editDialog, setEditDialog] = useState(false)

  const isMobile = useStatic((s) => s.isMobile)
  const { t } = useTranslation()
  const category = useWebhookStore((s) => s.category)
  const item = useWebhookStore((s) => s[category][index])
  const selected = useWebhookStore((s) => (item ? s.selected[item.uid] : false))

  if (!item) return <Box>&nbsp;</Box>

  const toggleWebhook = (open, id, newFilters) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return
    }
    setEditDialog(open)
    if (
      id &&
      newFilters &&
      !Object.keys(newFilters).every((key) => newFilters[key] === item[key])
    ) {
      apolloClient.mutate({
        mutation: webhookNodes[category],
        variables: {
          data: Poracle.processor(
            category,
            [newFilters],
            useWebhookStore.getState().context.ui[category].defaults,
          ),
          status: 'POST',
          category,
        },
      })
    }
  }

  const id = Poracle.getId(item, category)

  return (
    <Grid
      container
      item
      xs={12}
      bgcolor={Utility.getTileBackground(1, index)}
      justifyContent="center"
      alignItems="center"
      py={1}
    >
      <Grid item xs={2} sm={1}>
        <img
          src={useStatic.getState().Icons.getIconById(id)}
          alt={id}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid>
      <Grid item xs={6} sm={8} md={9}>
        <Typography variant="caption">
          {item.description || Poracle.generateDescription(item, category, t)}
        </Typography>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'right' }}>
        <IconButton size="small" onClick={() => setEditDialog(true)}>
          <Edit />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            useWebhookStore.setState((prev) => ({
              [category]: prev[category].filter((x) => x.uid !== item.uid),
            }))
            apolloClient.mutate({
              mutation: webhookNodes.setProfile,
              variables: {
                category,
                data: { uid: item.uid },
                status: 'DELETE',
              },
            })
            apolloClient.cache.modify({
              id: apolloCache.identify(item),
              fields: {
                uid() {
                  // deletes...?
                },
              },
            })
          }}
        >
          <DeleteForever />
        </IconButton>
        <Checkbox
          size="small"
          checked={!!selected}
          onChange={setSelected(item.uid)}
          color="secondary"
        />
      </Grid>
      <Dialog
        open={!!(editDialog && id)}
        fullWidth={!isMobile}
        fullScreen={isMobile}
        onClose={() => setEditDialog(false)}
      >
        <WebhookAdvanced
          id={id}
          category={category}
          // isMobile={isMobile}
          toggleWebhook={toggleWebhook}
          tempFilters={{ ...item, byDistance: !!item.distance }}
        />
      </Dialog>
    </Grid>
  )
}
