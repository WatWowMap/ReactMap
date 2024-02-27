// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'

import { hardReset } from '@services/functions/resetState'

export default function ResetAll() {
  hardReset()
  return <Navigate to="/" />
}
