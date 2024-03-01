/* eslint-disable react/no-array-index-key */
// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'

import { useMemory } from '@hooks/useMemory'
import ThemeToggle from '@components/layout/general/ThemeToggle'
import CustomLoginPage from './CustomPage'
import { DefaultLoginPage } from './DefaultPage'

export default function Login() {
  const loggedIn = useMemory((s) => s.auth.loggedIn)
  const loginPage = useMemory((s) => s.config.loginPage)

  if (loggedIn && process.env.NODE_ENV !== 'development') {
    return <Navigate to="/" />
  }
  return (
    <>
      <Box position="absolute" top={10} right={10}>
        <ThemeToggle />
      </Box>
      {loginPage ? <CustomLoginPage /> : <DefaultLoginPage />}
    </>
  )
}
