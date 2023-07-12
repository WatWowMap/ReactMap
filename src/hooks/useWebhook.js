import { useEffect } from 'react'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Query from '@services/Query'
import { useStatic } from '@hooks/useStore'

export default function useWebhook({ category, selectedWebhook }) {
  const [syncWebhook, { data }] = useMutation(Query.webhook('quickAdd'))
  const { t } = useTranslation()
  const webhookData = useStatic((state) => state.webhookData)
  const setWebhookData = useStatic((state) => state.setWebhookData)
  const setWebhookAlert = useStatic((state) => state.setWebhookAlert)

  useEffect(() => {
    if (data?.webhook) {
      if (data.webhook.status === 'success') {
        data.webhook.message = t(
          `webhook_success_${category.replace('quick', '').toLowerCase()}`,
        )
      }
      if (data.webhook.status === 'ok') {
        setWebhookAlert({
          open: true,
          severity: 'success',
          message: t('success'),
        })
      } else {
        setWebhookAlert({
          open: true,
          severity: data.webhook.status,
          message: data.webhook.message,
        })
      }
      if (webhookData?.[selectedWebhook]) {
        return setWebhookData({
          ...webhookData,
          [selectedWebhook]: {
            ...webhookData[selectedWebhook],
            ...data.webhook,
          },
        })
      }
    }
  }, [data])

  const addWebhook = (incomingData, cat) => {
    syncWebhook({
      variables: {
        category: cat,
        data: incomingData,
        name: selectedWebhook,
        status: 'POST',
      },
    })
  }

  return addWebhook
}
