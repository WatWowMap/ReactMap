// @ts-check
import * as React from 'react'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import {
  WEBHOOK_AREAS,
  WEBHOOK_CATEGORIES,
  WEBHOOK_CHANGE,
  WEBHOOK_CONTEXT,
  WEBHOOK_USER,
  allProfiles,
} from '@services/queries/webhook'
import { Loading } from '@components/Loading'

import { useGetWebhookData } from '../../hooks/useGetWebhookData'
import { useWebhookStore } from '../../hooks/store'

export function HookSelection() {
  const { t } = useTranslation()

  const {
    data: { selected, webhooks },
    loading,
  } = useGetWebhookData('human')
  const multipleHooks = useWebhookStore((s) => s.multipleHooks)

  const [save] = useMutation(WEBHOOK_CHANGE, {
    refetchQueries: [
      WEBHOOK_CONTEXT,
      WEBHOOK_USER,
      WEBHOOK_CATEGORIES,
      WEBHOOK_AREAS,
      allProfiles,
    ],
    fetchPolicy: 'no-cache',
  })

  if (!multipleHooks) return null

  return loading ? (
    <Loading>{t('loading', { category: t('webhooks') })}</Loading>
  ) : (
    <FormControl sx={{ m: 1 }}>
      <InputLabel id="hook-select">{t('select_webhook')}</InputLabel>
      <Select
        id="hook-select"
        label={t('select_webhook')}
        value={selected}
        onChange={(e) => {
          save({ variables: { webhook: e.target.value } }).then(
            ({ data }) =>
              data?.webhook?.human &&
              useWebhookStore.setState({ human: data.webhook.human }),
          )
        }}
        style={{ minWidth: 100 }}
      >
        {webhooks.map((webhook) => (
          <MenuItem key={webhook} value={webhook}>
            {webhook}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
