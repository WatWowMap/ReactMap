/* eslint-disable no-console */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react'
import { Grid, Typography, Button } from '@mui/material'
import Refresh from '@mui/icons-material/Refresh'
import { withTranslation } from 'react-i18next'
import Notification from './layout/general/Notification'

// This component uses React Classes due to componentDidCatch() not being available in React Hooks
// Do not use this as a base for other components

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      message: '',
      errorCount: 0,
    }
  }

  componentDidCatch(error) {
    console.error(error)
    this.setState((prev) => ({
      message: error?.message || '',
      errorCount: prev.errorCount + 1,
    }))
  }

  render() {
    return this.state.errorCount > 5 ? (
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
          {!this.props.noRefresh && (
            <>
              <br />
              <br />
              <Button
                onClick={() => (window.location = window.location.href)}
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
          messages={this.state.message}
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
