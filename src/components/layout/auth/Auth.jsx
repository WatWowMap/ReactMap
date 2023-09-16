// @ts-check
import * as React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { useStatic } from '@hooks/useStore'

import Container from '../../Container'
import WebhookQuery from '../../WebhookQuery'

export default function Auth() {
  const params = useParams()
  const mapPerm = useStatic((s) => s.auth.perms.map)

  if (!mapPerm) {
    if ((params.category && params.id) || (params.lat && params.lon)) {
      localStorage.setItem('params', JSON.stringify(params))
    }
    return <Navigate to="/login" />
  }
  const cachedParams = JSON.parse(localStorage.getItem('params'))
  if (cachedParams) {
    localStorage.removeItem('params')
    const url = cachedParams.category
      ? `/id/${cachedParams.category}/${cachedParams.id}/${
          cachedParams.zoom || 18
        }`
      : `/@/${cachedParams.lat}/${cachedParams.lon}/${cachedParams.zoom || 18}`
    return <Navigate to={url} />
  }
  if (params.category) {
    return (
      <WebhookQuery>
        <Container />
      </WebhookQuery>
    )
  }
  return <Container />
}
