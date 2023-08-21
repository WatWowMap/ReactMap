import { useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Query from '@services/Query'
import { useWebhookStore } from '@components/layout/dialogs/webhooks/store'
import { allProfiles } from '@services/queries/webhook'

export default function useWebhook({ category }) {
  const [syncWebhook, { data, error }] = useMutation(
    Query.webhook('quickAdd'),
    {
      refetchQueries: [allProfiles],
    },
  )
  const { t } = useTranslation()

  useEffect(() => {
    if (data?.webhook || error) {
      const message = error
        ? error.message
        : data?.webhook
        ? t(`webhook_success_${category.replace('quick', '').toLowerCase()}`)
        : t('success')
      useWebhookStore.setState({
        alert: {
          open: true,
          severity: error ? 'error' : 'success',
          message,
        },
      })
    }
  }, [data])

  const addWebhook = (incomingData, cat) => {
    syncWebhook({
      variables: {
        category: cat,
        data: incomingData,
        status: 'POST',
      },
    })
  }

  return addWebhook
}
