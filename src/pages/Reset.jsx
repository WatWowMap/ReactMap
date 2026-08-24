// @ts-check

import { hardReset } from '@utils/resetState'
import { Navigate } from 'react-router'

export function ResetPage() {
  hardReset()
  return <Navigate to="/" />
}
