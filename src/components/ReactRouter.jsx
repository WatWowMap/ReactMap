// @ts-check
import * as React from 'react'
import { Route, Routes } from 'react-router-dom'

import Auth from './layout/auth/Auth'
import LoginPage from '../pages/login'
import Blocked from './layout/auth/Blocked'
import Errors from './Errors'
import DataManagement from '../pages/data'
import Config from './Config'
import ResetAll from './Reset'

const Playground = React.lazy(() => import('../pages/playground'))

const authRoute = (
  <Config>
    <Auth />
  </Config>
)
const loginRoute = (
  <Config>
    <LoginPage />
  </Config>
)
const dataRoute = (
  <Config>
    <DataManagement />
  </Config>
)
const blockedRoute = (
  <Config>
    <Blocked />
  </Config>
)
const playgroundRoute = (
  <Config>
    <Playground />
  </Config>
)
const errorRoute = <Errors />
const resetRoute = <ResetAll />

export default function ReactRouter() {
  return (
    <Routes>
      <Route path="/" element={authRoute} />
      <Route path="reset" element={resetRoute} />
      <Route path="login" element={loginRoute} />
      <Route path="data-management" element={dataRoute} />
      <Route path="playground" element={playgroundRoute} />
      <Route path="blocked/:info" element={blockedRoute} />
      <Route path="@/:lat/:lon" element={authRoute} />
      <Route path="@/:lat/:lon/:zoom" element={authRoute} />
      <Route path="id/:category/:id" element={authRoute} />
      <Route path="id/:category/:id/:zoom" element={authRoute} />
      <Route path="*" element={errorRoute} />
    </Routes>
  )
}
