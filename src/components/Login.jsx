import React from 'react'
import {
  Grid, Button, Icon, Typography,
} from '@material-ui/core'

export default function Login() {
  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      style={{ minHeight: '100vh' }}
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
