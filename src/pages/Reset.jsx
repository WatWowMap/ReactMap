// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'

import { hardReset } from '@utils/resetState'

export default function ResetPage() {
  hardReset()
  return <Navigate to="/" />
}
