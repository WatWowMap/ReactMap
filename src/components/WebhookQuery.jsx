import React from 'react'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import ConfigSettings from './ConfigSettings'

export default function WebhookQuery({ match, serverSettings }) {
  let lowercase = match.params.category.toLowerCase()
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
      id: match.params.id,
      perm: match.params.category.toLowerCase(),
    },
  })
  return (
    <>
      {data && (
        <ConfigSettings
          paramLocation={data[`${lowercase}Single`]
            ? [data[`${lowercase}Single`].lat, data[`${lowercase}Single`].lon]
            : null}
          paramZoom={match.params.zoom}
          match={match}
          serverSettings={serverSettings}
        />
      )}
    </>
  )
}
