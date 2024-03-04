import * as React from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Edit from '@mui/icons-material/Edit'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'

import Utility from '@services/Utility'
import { useMemory } from '@hooks/useMemory'
import { apolloClient, apolloCache } from '@services/apollo'
import * as webhookNodes from '@services/queries/webhook'

import { useWebhookStore, setSelected } from '../hooks/store'
import { Poracle } from '../services/Poracle'

export default function TrackedTile({ index }) {
  const category = useWebhookStore((s) => s.category)
  const item = useWebhookStore((s) => s[category][index])
  const id = Poracle.getId(item)
  const advOpen = useWebhookStore((s) => s.advanced)
  const selected = useWebhookStore((s) => (item ? s.selected[item.uid] : false))
  const defaults = useWebhookStore((s) => s.context.ui[category].defaults)

  React.useEffect(() => {
    if (advOpen.open && advOpen.id === id && advOpen.uid === item.uid) {
      useWebhookStore.setState((prev) => ({
        tempFilters: {
          ...prev.tempFilters,
          [id]: { ...item, byDistance: !!item.distance },
        },
      }))
    }
  }, [advOpen, id, item])

  const onClose = React.useCallback(
    (newFilter, save) => {
      if (save) {
        apolloClient.mutate({
          mutation: webhookNodes[category],
          variables: {
            data: Poracle.processor(category, [newFilter], defaults),
            status: 'POST',
            category,
          },
        })
      }
    },
    [category, defaults],
  )

  if (!item) return <Box>&nbsp;</Box>

  return (
    <Grid2
      container
      xs={12}
      bgcolor={Utility.getTileBackground(1, index)}
      justifyContent="center"
      alignItems="center"
      py={1}
    >
      <Grid2 xs={2} sm={1}>
        <img
          src={useMemory.getState().Icons.getIconById(id)}
          alt={id}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid2>
      <Grid2 xs={6} sm={8} md={9}>
        <Typography variant="caption">
          {item.description || Poracle.generateDescription(item, category)}
        </Typography>
      </Grid2>
      <Grid2 xs={4} sm={3} md={2} textAlign="right">
        <IconButton
          size="small"
          disabled={!item.uid}
          onClick={() =>
            useWebhookStore.setState({
              advanced: {
                open: true,
                id,
                uid: item.uid,
                category,
                selectedIds: [],
                onClose,
              },
            })
          }
        >
          <Edit />
        </IconButton>
        <IconButton
          size="small"
          disabled={!item.uid}
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
          disabled={!item.uid}
          checked={!!selected}
          onChange={setSelected(item.uid)}
          color="secondary"
        />
      </Grid2>
    </Grid2>
  )
}
