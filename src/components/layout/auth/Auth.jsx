import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import Container from '../../Container'
import Login from './Login'
import WebhookQuery from '../../WebhookQuery'

export default function Auth({ serverSettings, getServerSettings, location, zoom }) {
  const params = useParams()

  if (serverSettings.error) {
    return (
      <Navigate push to={{ pathname: `${serverSettings.status}` }} />
    )
  }

  if ((serverSettings.authMethods.length && !serverSettings.user)
    || (serverSettings.user && !serverSettings.user?.perms?.map)) {
    if (params.category || params.lat) {
      localStorage.setItem('params', JSON.stringify(params))
    }
    return <Login serverSettings={serverSettings} getServerSettings={getServerSettings} />
  }
  const cachedParams = JSON.parse(localStorage.getItem('params'))
  if (cachedParams) {
    localStorage.removeItem('params')
    const url = cachedParams.category
      ? `/id/${cachedParams.category}/${cachedParams.id}/${cachedParams.zoom || 18}`
      : `/@/${cachedParams.lat}/${cachedParams.lon}/${cachedParams.zoom || 18}`
    return <Navigate push to={url} />
  }
  if (params.category) {
    return (
      <WebhookQuery
        params={params}
        serverSettings={serverSettings}
      />
    )
  }
  return (
    <Container serverSettings={serverSettings} params={params} location={location} zoom={zoom} />
  )
}
