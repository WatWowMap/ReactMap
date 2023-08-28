// @ts-check
import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import { useStore } from '@hooks/useStore'

/**
 * @param {string} category
 * @returns {string | null}
 */
const getLowerCase = (category) => {
  if (!category) return null
  const lowercase = category.toLowerCase()
  switch (lowercase) {
    case 'gyms':
    case 'raids':
      return 'gyms'
    case 'pokestops':
    case 'invasions':
    case 'lures':
      return 'pokestops'
    default:
      return lowercase
  }
}

export default function WebhookQuery({ children }) {
  const params = useParams()
  const lowercase = getLowerCase(params.category)

  const { data } = useQuery(Query[lowercase]('id'), {
    variables: {
      id: params.id,
      perm: params.category.toLowerCase(),
    },
    skip: !lowercase,
  })

  React.useEffect(() => {
    if (
      lowercase &&
      data?.[`${lowercase}Single`]?.lat &&
      data[`${lowercase}Single`]?.lon
    ) {
      useStore.setState((prev) => ({
        location: [
          data[`${lowercase}Single`].lat,
          data[`${lowercase}Single`].lon,
        ],
        zoom: +params.zoom || prev.zoom,
      }))
    }
  }, [data])

  return data ? children : null
}
