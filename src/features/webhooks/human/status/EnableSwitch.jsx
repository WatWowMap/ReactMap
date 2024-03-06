import * as React from 'react'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { SET_HUMAN } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

export function EnableSwitch() {
  const { t } = useTranslation()

  const human = useWebhookStore((s) => s.human)
  const [save] = useMutation(SET_HUMAN, { fetchPolicy: 'no-cache' })

  return (
    <FormControlLabel
      control={
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
      }
      label={t('enabled')}
    />
  )
}
