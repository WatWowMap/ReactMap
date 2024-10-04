import * as React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Config } from '@components/Config'

import { MapPage } from './map'
import { LoginPage } from './login'
import { BlockedPage } from './Blocked'
import { ErrorPage } from './Error'
import { DataManagerPage } from './data'
import { ResetPage } from './Reset'
import { LocalesPage } from './locales'

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
const localesPage = <LocalesPage />

export function Pages() {
  return (
    <Routes>
      <Route element={mapRoute} path="/" />
      <Route element={resetRoute} path="reset" />
      <Route element={loginRoute} path="login" />
      <Route element={dataRoute} path="data-management" />
      <Route element={localesPage} path="locales" />
      <Route element={playgroundRoute} path="playground" />
      <Route element={blockedRoute} path="blocked/:info" />
      <Route element={mapRoute} path="@/:lat/:lon" />
      <Route element={mapRoute} path="@/:lat/:lon/:zoom" />
      <Route element={mapRoute} path="id/:category/:id" />
      <Route element={mapRoute} path="id/:category/:id/:zoom" />
      <Route element={errorRoute} path="*" />
    </Routes>
  )
}
