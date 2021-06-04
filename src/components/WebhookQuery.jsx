import React from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import ConfigSettings from './ConfigSettings'

export default function WebhookQuery({ params, serverSettings }) {
  let lowercase = params.category.toLowerCase()
  if (lowercase === 'invasions'
    || lowercase === 'lures'
    || lowercase === 'quests') {
    lowercase = 'pokestops'
  }
  if (lowercase === 'raids') {
    lowercase = 'gyms'
  }
  const { data } = useQuery(Query[lowercase]('id'), {
    variables: {
      id: params.id,
      perm: params.category.toLowerCase(),
    },
  })
  return (
    <>
      {data && (
        <ConfigSettings
          paramLocation={[data[`${lowercase}Single`].lat, data[`${lowercase}Single`].lon]}
          paramZoom={params.zoom}
          serverSettings={serverSettings}
        />
      )}
    </>
  )
}
