/* eslint-disable react/no-array-index-key */
// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { VALIDATE_USER } from '@services/queries/config'

import { CodeWrapper } from './components/Editor'
import { Toolbar } from './components/Toolbar'
import { Viewer } from './components/Viewer'

export default function Playground() {
  const { data } = useQuery(VALIDATE_USER)

  if (data?.validateUser === undefined) return null
  if (data?.validateUser?.admin !== true && data?.validateUser?.loggedIn)
    return <Navigate to="/" />
  if (
    data?.validateUser?.admin !== true &&
    data?.validateUser?.loggedIn !== true
  )
    return <Navigate to="/login" />

  return (
    <Box height="100vh">
      <Toolbar />
      <Grid2 container>
        <CodeWrapper />
        <Viewer />
      </Grid2>
    </Box>
  )
}
