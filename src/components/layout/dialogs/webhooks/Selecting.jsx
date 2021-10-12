import React from 'react'
import { Grid, Fab } from '@material-ui/core'

export default function Selecting({ setSelected, handleAll }) {
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      style={{ position: 'absolute', bottom: 75, width: '90%' }}
    >
      <Grid item xs={2} sm={1} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={() => setSelected({})}
        >
          X
        </Fab>
      </Grid>
      <Grid item xs={4} sm={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={handleAll}
        >
          Select All
        </Fab>
      </Grid>
      <Grid item xs={4} sm={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={handleAll}
        >
          Delete All
        </Fab>
      </Grid>
    </Grid>
  )
}
