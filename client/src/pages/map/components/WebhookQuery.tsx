import * as React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'

import { Query } from '@services/queries'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

const getLowerCase = (category: string): string | null => {
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

export function WebhookQuery({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const lowercase = getLowerCase(params.category)

  const [ready, setReady] = React.useState(false)

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
      useStorage.setState((prev) => ({
        location: [
          data[`${lowercase}Single`].lat,
          data[`${lowercase}Single`].lon,
        ],
        zoom: +params.zoom || prev.zoom,
      }))
      useMemory.setState({
        manualParams: {
          category: params.category,
          id: params.id,
        },
      })
      setReady(true)
    }
  }, [data])

  return (data?.[`${lowercase}Single`]?.lat ? ready : data) ? children : null
}
