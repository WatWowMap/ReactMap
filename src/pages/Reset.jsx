// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router'

import { hardReset } from '@utils/resetState'

export function ResetPage() {
  hardReset()
  return <Navigate to="/" />
}
