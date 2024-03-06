// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import {
  WEBHOOK_AREAS,
  WEBHOOK_CATEGORIES,
  WEBHOOK_CHANGE,
  WEBHOOK_CONTEXT,
  WEBHOOK_USER,
  ALL_PROFILES,
} from '@services/queries/webhook'
import { Loading } from '@components/Loading'
import { useWebhookStore } from '@store/useWebhookStore'
import { FCSelect } from '@components/inputs/FCSelect'

import { useGetWebhookData } from '../../hooks/useGetWebhookData'

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
      ALL_PROFILES,
    ],
    fetchPolicy: 'no-cache',
  })

  if (!multipleHooks) return null

  return loading ? (
    <Loading>{t('loading', { category: t('webhooks') })}</Loading>
  ) : (
    <FCSelect
      label={t('select_webhook')}
      value={selected}
      onChange={(e) => {
        save({ variables: { webhook: e.target.value } }).then(
          ({ data }) =>
            data?.webhook?.human &&
            useWebhookStore.setState({ human: data.webhook.human }),
        )
      }}
      fcSx={{ m: 1, width: '90%' }}
    >
      {webhooks.map((webhook) => (
        <MenuItem key={webhook} value={webhook}>
          {webhook}
        </MenuItem>
      ))}
    </FCSelect>
  )
}
