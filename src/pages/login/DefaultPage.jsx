// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'

import { useMemory } from '@hooks/useMemory'
import LocaleSelection from '@components/general/LocaleSelection'

import methods from './Methods'

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
}))
StyledDivider.defaultProps = { flexItem: true }

export function DefaultLoginPage() {
  const { t } = useTranslation()
  const headerTitle = useMemory((s) => s.config.general.headerTitle)
  const authMethods = useMemory((s) => s.auth.methods)
  return (
    <Grid
      alignItems="center"
      justifyContent="center"
      height="100cqh"
      width="100%"
      container
      direction="column"
    >
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        my={4}
        minWidth="min(90%, 400px)"
        maxWidth={500}
        flexGrow={1}
      >
        <Grid pb={8}>
          <Typography variant="h3" align="center">
            {t('welcome')} {headerTitle}
          </Typography>
        </Grid>
        {authMethods.map((method, index) => (
          <React.Fragment key={method}>
            {!!index && <StyledDivider />}
            {methods[method] || null}
          </React.Fragment>
        ))}
      </Grid>
      <Grid pb={2} width="min(50%, 300px)">
        <LocaleSelection />
      </Grid>
    </Grid>
  )
}
