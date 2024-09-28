import { Navigate } from 'react-router-dom'
import { hardReset } from '@utils/resetState'

export function ResetPage() {
  hardReset()

  return <Navigate to="/" />
}
