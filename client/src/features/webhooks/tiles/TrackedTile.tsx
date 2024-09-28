import * as React from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Edit from '@mui/icons-material/Edit'
import Grid2 from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'
import { useMemory } from '@store/useMemory'
import { apolloClient, apolloCache } from '@services/apollo'
import * as webhookNodes from '@services/queries/webhook'
import { getTileBackground } from '@utils/getTileBackground'
import { useWebhookStore, setSelected } from '@store/useWebhookStore'

import { Poracle } from '../services/Poracle'

export function TrackedTile({ index }) {
  const category = useWebhookStore((s) => s.category)
  const item = useWebhookStore((s) => s[category][index])
  const id = Poracle.getId(item)
  const advOpen = useWebhookStore((s) => s.advanced)
  const selected = useWebhookStore((s) => (item ? s.selected[item.uid] : false))
  const defaults = useWebhookStore((s) =>
    category === 'human' ? null : s.context.ui[category].defaults,
  )

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
          mutation: webhookNodes[category.toUpperCase()],
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

  if (!item || category === 'human') return <Box>&nbsp;</Box>

  return (
    <Grid2
      container
      alignItems="center"
      bgcolor={getTileBackground(1, index)}
      justifyContent="center"
      py={1}
      xs={12}
    >
      <Grid2 sm={1} xs={2}>
        <img
          alt={id}
          src={useMemory.getState().Icons.getIconById(id)}
          style={{ maxWidth: 40, maxHeight: 40 }}
        />
      </Grid2>
      <Grid2 md={9} sm={8} xs={6}>
        <Typography variant="caption">
          {item.description || Poracle.generateDescription(item, category)}
        </Typography>
      </Grid2>
      <Grid2 md={2} sm={3} textAlign="right" xs={4}>
        <IconButton
          disabled={!item.uid}
          size="small"
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
          disabled={!item.uid}
          size="small"
          onClick={() => {
            useWebhookStore.setState((prev) => ({
              [category]: prev[category].filter((x) => x.uid !== item.uid),
            }))
            apolloClient.mutate({
              mutation: webhookNodes.SET_PROFILE,
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
          checked={!!selected}
          color="secondary"
          disabled={!item.uid}
          size="small"
          onChange={setSelected(item.uid)}
        />
      </Grid2>
    </Grid2>
  )
}
