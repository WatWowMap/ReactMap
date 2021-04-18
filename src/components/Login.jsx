import React from 'react'
import {
  Grid, Button, Icon, Typography,
} from '@material-ui/core'
import useStyles from '../assets/mui/styling'

export default function Login() {
  const classes = useStyles()
  return (
    <Grid
      className={classes.login}
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
