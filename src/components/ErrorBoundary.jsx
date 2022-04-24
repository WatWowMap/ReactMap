/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react'
import { Grid, Typography, Button } from '@material-ui/core'
import { Refresh } from '@material-ui/icons'
import { withTranslation } from 'react-i18next'

// This component uses React Classes due to componentDidCatch() not being available in React Hooks
// Do not use this as a base for other components

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '', info: '' }
  }

  componentDidCatch(error, info) {
    this.setState({
      hasError: true,
      message: inject.DEVELOPMENT ? error : error?.message || '',
      info: inject.DEVELOPMENT ? info : '',
    })
  }

  render() {
    return this.state.hasError ? (
      <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh', width: '100%', textAlign: 'center' }}>
        <Grid item xs={12}>
          <Typography variant="h3" align="center" style={{ color: 'white' }}>
            {this.props.t('react_error')}
          </Typography>
          <Typography variant="subtitle2" align="center" style={{ color: 'white' }}>
            {this.state.message}
          </Typography>
          <Typography variant="subtitle2" align="center" style={{ color: 'white' }}>
            {this.state.info}
          </Typography>
          <br />
          <br />
          <Button
            onClick={() => window.location = window.location.href}
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
          >
            {this.props.t('refresh')}
          </Button>
        </Grid>
      </Grid>
    ) : this.props.children
  }
}

export default withTranslation()(ErrorBoundary)
