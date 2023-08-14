import * as React from 'react'
import Switch from '@mui/material/Switch'
import { useMutation } from '@apollo/client'
import { setHuman } from '@services/queries/webhook'
import { useWebhookStore } from '../store'

export function EnableSwitch() {
  const enabled = useWebhookStore((s) => !!s.human.enabled || false)

  const [save] = useMutation(setHuman, { fetchPolicy: 'no-cache' })

  return (
    <Switch
      color="secondary"
      checked={enabled}
      onChange={() => {
        save({
          variables: {
            category: enabled ? 'stop' : 'start',
            status: 'POST',
          },
        }).then(({ data }) => {
          if (data?.webhook)
            useWebhookStore.setState({ human: data.webhook?.human })
        })
      }}
    />
  )
}

export const MemoEnableSwitch = React.memo(EnableSwitch, () => true)
