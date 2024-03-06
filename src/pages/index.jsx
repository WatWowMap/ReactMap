// @ts-check
import * as React from 'react'
import { Route, Routes } from 'react-router-dom'

import { Config } from '@components/Config'
import { MapPage } from './map'
import { LoginPage } from './login'
import { BlockedPage } from './Blocked'
import { ErrorPage } from './Error'
import { DataManagerPage } from './data'
import { ResetPage } from './Reset'

const Playground = React.lazy(() =>
  import('./playground').then(({ PlaygroundPage }) => ({
    default: PlaygroundPage,
  })),
)

const mapRoute = (
  <Config>
    <MapPage />
  </Config>
)
const loginRoute = (
  <Config>
    <LoginPage />
  </Config>
)
const dataRoute = (
  <Config>
    <DataManagerPage />
  </Config>
)
const blockedRoute = (
  <Config>
    <BlockedPage />
  </Config>
)
const playgroundRoute = (
  <Config>
    <Playground />
  </Config>
)
const errorRoute = <ErrorPage />
const resetRoute = <ResetPage />

export function Pages() {
  return (
    <Routes>
      <Route path="/" element={mapRoute} />
      <Route path="reset" element={resetRoute} />
      <Route path="login" element={loginRoute} />
      <Route path="data-management" element={dataRoute} />
      <Route path="playground" element={playgroundRoute} />
      <Route path="blocked/:info" element={blockedRoute} />
      <Route path="@/:lat/:lon" element={mapRoute} />
      <Route path="@/:lat/:lon/:zoom" element={mapRoute} />
      <Route path="id/:category/:id" element={mapRoute} />
      <Route path="id/:category/:id/:zoom" element={mapRoute} />
      <Route path="*" element={errorRoute} />
    </Routes>
  )
}
