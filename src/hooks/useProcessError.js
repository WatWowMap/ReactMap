// @ts-check
import { t } from 'i18next'

import { useMemory } from '@store/useMemory'
import { useWebhookStore } from '@store/useWebhookStore'
import React from 'react'

/**
 *
 * @param {import('@apollo/client').ApolloError} error
 */
export const useProcessError = (error) => {
  const [errorState, setErrorState] = React.useState(false)

  React.useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    if (error?.networkError && 'statusCode' in error.networkError) {
      if (error.networkError?.statusCode === 464) {
        useMemory.setState({ clientError: 'old_client' })
        setErrorState(true)
      }
      if (error.networkError?.statusCode === 511) {
        useMemory.setState({ clientError: 'session_expired' })
        setErrorState(true)
      }
      if (error.networkError?.statusCode === 429) {
        const until =
          // @ts-ignore
          error?.networkError?.result?.errors?.[0]?.extensions?.until || 0
        useWebhookStore.setState({
          alert: {
            open: true,
            severity: 'warning',
            message: t('data_limit_reached', {
              until: `${
                new Date(until).toTimeString().split('GMT')[0]
              } (${Math.ceil((until - Date.now()) / 1000)}s)`,
            }).toString(),
          },
        })
        setErrorState(false)
      }
    }
    setErrorState(false)
  }, [error])

  return errorState
}
