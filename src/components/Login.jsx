import React from 'react'
import {
  Grid, Button, Icon, Typography,
} from '@material-ui/core'

export default function Login() {
  return (
    <Grid
      style={{
        display: 'flex',
        margin: '45% auto auto auto',
        backgroundColor: 'rgb(52, 52, 52)',
      }}
      container
      direction="row"
      justify="center"
      alignItems="center"
    >
      <Grid item>
        <Button
          variant="contained"
          style={{
            backgroundColor: 'rgb(114,136,218)',
            color: 'white',
          }}
          size="large"
          href="/auth/discord"
        >
          <Icon className="fab fa-discord" style={{ fontSize: 30 }} />&nbsp;
          <Typography variant="h6">
            Login
          </Typography>
        </Button>
      </Grid>
    </Grid>
  )
}
