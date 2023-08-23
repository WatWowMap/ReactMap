// @ts-check
import * as React from 'react'
import { Route, Routes } from 'react-router-dom'

import Auth from './layout/auth/Auth'
import Login from './layout/auth/Login'
import Blocked from './layout/auth/Blocked'
import Errors from './Errors'
import ClearStorage from './ClearStorage'

const Playground = React.lazy(() => import('../features/playground'))

export default function ReactRouter({ serverSettings }) {
  const authRoute = React.useMemo(
    () => <Auth serverSettings={serverSettings} />,
    [serverSettings],
  )

  return (
    <Routes>
      <Route path="/" element={authRoute} />
      <Route path="reset" element={<ClearStorage />} />
      <Route path="login" element={<Login serverSettings={serverSettings} />} />
      <Route path="playground" element={<Playground />} />
      <Route
        path="blocked/:info"
        element={<Blocked serverSettings={serverSettings} />}
      />
      <Route path="@/:lat/:lon" element={authRoute} />
      <Route path="@/:lat/:lon/:zoom" element={authRoute} />
      <Route path="id/:category/:id" element={authRoute} />
      <Route path="id/:category/:id/:zoom" element={authRoute} />
      <Route path="*" element={<Errors />} />
    </Routes>
  )
}
