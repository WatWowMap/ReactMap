// @ts-check

import { Config } from '@components/Config'
import * as React from 'react'
import { Route, Routes } from 'react-router'
import { BlockedPage } from './Blocked'
import { DataManagerPage } from './data'
import { ErrorPage } from './Error'
import { LocalesPage } from './locales'
import { LoginPage } from './login'
import { MapPage } from './map'
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
const localesPage = <LocalesPage />

export function Pages() {
  return (
    <Routes>
      <Route path="/" element={mapRoute} />
      <Route path="reset" element={resetRoute} />
      <Route path="login" element={loginRoute} />
      <Route path="data-management" element={dataRoute} />
      <Route path="locales" element={localesPage} />
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
