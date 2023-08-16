import * as React from 'react'
import Switch from '@mui/material/Switch'
import { useMutation } from '@apollo/client'
import { setHuman } from '@services/queries/webhook'
import { useWebhookStore } from '../../store'

export function EnableSwitch() {
  const human = useWebhookStore((s) => s.human)
  const [save] = useMutation(setHuman, { fetchPolicy: 'no-cache' })

  return (
    <Switch
      color="secondary"
      checked={!!human.enabled}
      onChange={() => {
        save({
          variables: {
            category: human.enabled ? 'stop' : 'start',
            status: 'POST',
          },
        }).then(({ data }) =>
          useWebhookStore.setState({ human: data.webhook.human }),
        )
      }}
    />
  )
}
