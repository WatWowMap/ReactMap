/* eslint-disable no-bitwise */
// @ts-check
/* eslint-disable no-console */
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Refresh from '@mui/icons-material/Refresh'
import { withTranslation } from 'react-i18next'

import Fetch from '@services/Fetch'
import Notification from './layout/general/Notification'

// This component uses React Classes due to componentDidCatch() not being available in React Hooks
// Do not use this as a base for other components

class ErrorBoundary extends React.Component {
  static uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      message: '',
      errorCount: 0,
      reported: false,
      uuid: ErrorBoundary.uuidv4(),
    }
  }

  async componentDidCatch(error) {
    if (!this.state.reported) {
      await Fetch.sendError({
        cause: error.cause,
        message: error.message,
        stack: error?.stack,
        name: error.name,
        uuid: this.state.uuid,
      })
    }
    this.setState((prev) => ({
      message: error?.message || '',
      errorCount: prev.errorCount + 1,
      reported: true,
    }))
  }

  render() {
    return this.state.errorCount >
      (process.env.NODE_ENV === 'development' ? 1 : 3) ? (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={
          this.props.style ?? {
            height: '100vh',
            width: '100vw',
            textAlign: 'center',
          }
        }
      >
        <Grid item xs={12}>
          <Typography variant={this.props.variant || 'h3'} align="center">
            {this.props.t('react_error')}
          </Typography>
          <Typography variant="subtitle2" align="center">
            {this.state.message}
          </Typography>
          {this.state.reported && (
            <Typography variant="subtitle2" align="center">
              <br />
              {this.props.t('reported_error')}
              <br />
              {this.state.uuid}
            </Typography>
          )}
          {!this.props.noRefresh && (
            <>
              <br />
              <br />
              <Button
                onClick={() => window.location.reload()}
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
              >
                {this.props.t('refresh')}
              </Button>
            </>
          )}
        </Grid>
      </Grid>
    ) : (
      <>
        <Notification
          open={this.state.errorCount > 0}
          cb={() => this.setState({ errorCount: 0 })}
          severity="error"
          title="react_error"
        >
          <Typography>{this.state.message}</Typography>
        </Notification>
        {this.props.children || null}
      </>
    )
  }
}

export default withTranslation()(ErrorBoundary)
