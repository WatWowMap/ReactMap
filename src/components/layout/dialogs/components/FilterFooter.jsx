import React from 'react'
import {
  DialogActions, Button, Typography, IconButton, useMediaQuery,
} from '@material-ui/core'
import { Menu } from '@material-ui/icons'
import { useTheme } from '@material-ui/core/styles'

import useStyles from '../../../../assets/mui/styling'

export default function FilterFooter({
  selectAllOrNone, toggleDialog, tempFilters, toggleDrawer,
}) {
  const classes = useStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'))

  return (
    <DialogActions className={classes.filterFooter}>
      {isMobile
        && (
        <IconButton
          onClick={toggleDrawer(true)}
        >
          <Menu style={{ color: 'white' }} />
        </IconButton>
        )}
      <Button
        onClick={() => selectAllOrNone(false)}
        color="primary"
      >
        <Typography variant="caption">
          Deselect All
        </Typography>
      </Button>
      <Button
        onClick={() => selectAllOrNone(true)}
        color="secondary"
      >
        <Typography variant="caption">
          Select All
        </Typography>
      </Button>
      <Button
        onClick={toggleDialog(false, 'pokemon', tempFilters)}
        className={classes.successButton}
      >
        <Typography variant="caption">
          Save
        </Typography>
      </Button>
    </DialogActions>
  )
}
