import React from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import ConfigSettings from './ConfigSettings'

export default function WebhookQuery({ params, serverSettings }) {
  const lowerCase = params.category.toLowerCase()
  const { data } = useQuery(Query[lowerCase]('id'), {
    variables: { id: params.id },
  })
  return (
    <>
      {data && (
        <ConfigSettings
          paramLocation={[data[`${lowerCase}Single`].lat, data[`${lowerCase}Single`].lon]}
          serverSettings={serverSettings}
        />
      )}
    </>
  )
}
