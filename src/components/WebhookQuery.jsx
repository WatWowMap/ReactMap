import React from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import ConfigSettings from './ConfigSettings'

export default function WebhookQuery({ params, serverSettings }) {
  const lowerCase = params.category.toLowerCase()
  const sCheck = lowerCase.charAt(lowerCase.length) !== 's' ? `${lowerCase}s` : lowerCase
  const { data } = useQuery(Query[sCheck]('id'), {
    variables: { id: params.id },
  })
  return (
    <>
      {data && (
        <ConfigSettings
          paramLocation={[data[`${sCheck}Single`].lat, data[`${sCheck}Single`].lon]}
          serverSettings={serverSettings}
        />
      )}
    </>
  )
}
