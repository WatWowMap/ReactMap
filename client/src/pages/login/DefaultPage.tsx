import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import { useMemory } from '@store/useMemory'
import { LocaleSelection } from '@components/inputs/LocaleSelection'

import { methods } from './Methods'

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
      container
      alignItems="center"
      direction="column"
      height="100cqh"
      justifyContent="center"
      width="100%"
    >
      <Grid
        container
        alignItems="center"
        direction="column"
        flexGrow={1}
        justifyContent="center"
        maxWidth={500}
        minWidth="min(90%, 400px)"
        my={4}
      >
        <Grid pb={8}>
          <Typography align="center" variant="h3">
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
