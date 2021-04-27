import React, { useState } from 'react'
import {
  Button, Typography, IconButton, Grid, Dialog,
} from '@material-ui/core'
import {
  Menu, Ballot, Check, Clear, Save, HelpOutline,
} from '@material-ui/icons'
import Help from './Help'

export default function FilterFooter({
  selectAllOrNone, toggleDialog, tempFilters, toggleDrawer, isMobile, toggleAdvMenu,
}) {
  const [helpDialog, setHelpDialog] = useState(false)

  const toggleHelp = () => {
    setHelpDialog(!helpDialog)
  }

  const help = {
    key: 'help',
    content: isMobile
      ? (
        <IconButton
          onClick={toggleHelp}
        >
          <HelpOutline style={{ color: 'white' }} />
        </IconButton>
      )
      : (
        <Button onClick={toggleHelp}>
          <Typography variant="caption">
            Help
          </Typography>
        </Button>
      ),
  }

  const openFilter = {
    key: 'openFilter',
    content: isMobile
      ? (
        <IconButton
          onClick={toggleDrawer(true)}
        >
          <Ballot style={{ color: 'white' }} />
        </IconButton>
      )
      : null,
  }

  const advMenu = {
    key: 'advMenu',
    content: isMobile
      ? (
        <IconButton
          onClick={toggleAdvMenu(true, 'ivAnd')}
        >
          <Menu style={{ color: 'white' }} />
        </IconButton>
      )
      : (
        <Button onClick={toggleAdvMenu(true, 'ivAnd')}>
          <Typography variant="caption">
            Apply IV to All
          </Typography>
        </Button>
      ),
  }

  const disableAll = {
    key: 'disableAll',
    content: isMobile
      ? (
        <IconButton
          onClick={() => selectAllOrNone(false)}
        >
          <Clear color="primary" />
        </IconButton>
      )
      : (
        <Button
          onClick={() => selectAllOrNone(false)}
          color="primary"
        >
          <Typography variant="caption">
            Disable All
          </Typography>
        </Button>
      ),
  }

  const enableAll = {
    key: 'enabledAll',
    content: isMobile
      ? (
        <IconButton
          onClick={() => selectAllOrNone(true)}
        >
          <Check style={{ color: 'green' }} />
        </IconButton>
      )
      : (
        <Button
          onClick={() => selectAllOrNone(true)}
          style={{ color: 'green' }}
        >
          <Typography variant="caption">
            Enable All
          </Typography>
        </Button>
      ),
  }

  const save = {
    key: 'save',
    content: isMobile
      ? (
        <IconButton
          onClick={toggleDialog(false, 'pokemon', tempFilters)}
        >
          <Save color="secondary" />
        </IconButton>
      )
      : (
        <Button
          onClick={toggleDialog(false, 'pokemon', tempFilters)}
          color="secondary"
        >
          <Typography
            variant="caption"
          >
            Save
          </Typography>
        </Button>
      ),
  }

  return (
    <>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={helpDialog}
        onClose={toggleHelp}
      >
        <Help />
      </Dialog>
      <Grid
        className="filter-footer"
        container
        justify={isMobile ? 'center' : 'flex-end'}
        alignItems="center"
      >
        {[help, openFilter, advMenu, disableAll, enableAll, save].map(button => (
          <Grid item xs={2} key={button.key}>
            {button.content}
          </Grid>
        ))}
      </Grid>
    </>
  )
}
