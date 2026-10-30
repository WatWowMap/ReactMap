// @ts-check

import * as React from 'react'
import DeleteForever from '@mui/icons-material/DeleteForever'
import Edit from '@mui/icons-material/Edit'
import Grid2 from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Box from '@mui/material/Box'

import { useMemory } from '@store/useMemory'
import { apolloClient } from '@services/apollo'
import * as webhookNodes from '@services/queries/webhook'
import { getTileBackground } from '@utils/getTileBackground'
import {
  useWebhookStore,
  setSelected,
  applyWebhookResult,
  showWebhookError,
} from '@store/useWebhookStore'

import { Poracle } from '../services/Poracle'
import { formToRule } from '../services/ruleForm'

export function TrackedTile({ index }) {
  const category = useWebhookStore((s) => s.category)
  const item = useWebhookStore((s) => s[category][index])
  const id = Poracle.getId(item)
  const advOpen = useWebhookStore((s) => s.advanced)
  const selected = useWebhookStore((s) => (item ? s.selected[item.uid] : false))
  const info = useWebhookStore((s) =>
    category === 'human' ? null : s.context.ui[category],
  )

  React.useEffect(() => {
    if (advOpen.open && advOpen.id === id && advOpen.uid === item.uid) {
      useWebhookStore.setState((prev) => ({
        tempFilters: {
          ...prev.tempFilters,
          [id]: { ...item },
        },
      }))
    }
  }, [advOpen, id, item])

  const onClose = React.useCallback(
    (newFilter, save) => {
      if (save && info) {
        apolloClient
          .mutate({
            mutation: webhookNodes[category.toUpperCase()],
            variables: {
              data: [formToRule(category, newFilter, info, item)],
              status: 'POST',
              category,
            },
          })
          .then(({ data }) => applyWebhookResult(category, data?.webhook))
          .catch(showWebhookError)
      }
    },
    [category, info, item],
  )

  if (!item || category === 'human') return <Box>&nbsp;</Box>

  return (
    <Grid2
      container
      xs={12}
      bgcolor={getTileBackground(1, index)}
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
            apolloClient
              .mutate({
                mutation: webhookNodes[category.toUpperCase()],
                variables: {
                  category,
                  data: { uid: item.uid },
                  status: 'DELETE',
                },
              })
              .then(({ data }) => applyWebhookResult(category, data?.webhook))
              .catch(showWebhookError)
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
