// @ts-check
import * as React from 'react'
import { Route, Routes } from 'react-router-dom'

import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import Blocked from './layout/auth/Blocked'
import Errors from './Errors'
import ClearStorage from './ClearStorage'
import Config from './Config'

const Playground = React.lazy(() => import('../features/playground'))

const authRoute = (
  <Config>
    <Auth />
  </Config>
)
const loginRoute = (
  <Config>
    <Login />
  </Config>
)
const resetRoute = <ClearStorage />
const blockedRoute = (
  <Config>
    <Blocked />
  </Config>
)
const errorRoute = <Errors />

export default function ReactRouter() {
  return (
    <Routes>
      <Route path="/" element={authRoute} />
      <Route path="reset" element={resetRoute} />
      <Route path="login" element={loginRoute} />
      <Route
        path="playground"
        element={
          <Config>
            <Playground />
          </Config>
        }
      />
      <Route path="blocked/:info" element={blockedRoute} />
      <Route path="@/:lat/:lon" element={authRoute} />
      <Route path="@/:lat/:lon/:zoom" element={authRoute} />
      <Route path="id/:category/:id" element={authRoute} />
      <Route path="id/:category/:id/:zoom" element={authRoute} />
      <Route path="*" element={errorRoute} />
    </Routes>
  )
}
