// @ts-check
/* eslint-disable no-bitwise */
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Refresh from '@mui/icons-material/Refresh'
import CopyIcon from '@mui/icons-material/FileCopy'
import IconButton from '@mui/material/IconButton'
import { withTranslation } from 'react-i18next'

import { sendError } from '@services/fetches'

import { Notification } from './Notification'

/** @type {React.CSSProperties} */
const defaultStyle = {
  height: '100vh',
  width: '100vw',
  textAlign: 'center',
}

// This component uses React Classes due to componentDidCatch() not being available in React Hooks
// Do not use this as a base for other components

class ErrorCatcher extends React.Component {
  static uuidv4() {
    return 'xxxxxxxx-r2m4-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
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
      uuid: ErrorCatcher.uuidv4(),
    }
  }

  async componentDidCatch(error) {
    if (!this.state.reported && process.env.NODE_ENV !== 'development') {
      await sendError({
        cause: error.cause,
        message: error.message,
        stack: error?.stack?.replace(
          /(http|https):\/\/[a-z0-9.]+(:[0-9]+)?/g,
          '',
        ),
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
        style={this.props.style ?? defaultStyle}
      >
        <Grid xs={12}>
          <Typography variant={this.props.variant || 'h3'} align="center">
            {this.props.t('react_error')}
          </Typography>
          <Typography variant="subtitle2" align="center">
            {this.state.message}
          </Typography>
          {this.state.reported && (
            <Typography variant="subtitle2" align="center">
              <br />
              {this.props.t('reported_error')}:
              <br />
              {this.state.uuid}{' '}
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(this.state.uuid)}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
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
          {this.props.resettable && (
            <>
              <br />
              <br />
              <Button
                onClick={() => this.setState({ errorCount: 0 })}
                variant="contained"
                color="primary"
              >
                {this.props.t('reset')}
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

export const ErrorBoundary = withTranslation()(ErrorCatcher)
