// @ts-check
import * as React from 'react'
import { Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'

import { useMemory } from '@store/useMemory'
import { ThemeToggle } from '@components/inputs/ThemeToggle'
import { CustomLoginPage } from '@features/builder'

import { DefaultLoginPage } from './DefaultPage'

export function LoginPage() {
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
