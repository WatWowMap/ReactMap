import React, { useState } from 'react'
import {
  Button, Typography, IconButton, Grid, Dialog,
} from '@material-ui/core'
import {
  Menu, Ballot, Check, Clear, Save, HelpOutline,
} from '@material-ui/icons'

import Help from '../help/Filters'
import { useMasterfile } from '../../../../hooks/useStore'

export default function FilterFooter({
  selectAllOrNone, toggleDialog, tempFilters, toggleDrawer, isMobile, toggleAdvMenu, type,
}) {
  const { text } = useMasterfile(state => state.ui)
  const [helpDialog, setHelpDialog] = useState(false)

  const toggleHelp = () => {
    setHelpDialog(!helpDialog)
  }

  const help = {
    key: 'help',
    icon: (
      <IconButton
        onClick={toggleHelp}
      >
        <HelpOutline style={{ color: 'white' }} />
      </IconButton>
    ),
    text: (
      <Button onClick={toggleHelp}>
        <Typography variant="caption">
          {text.help}
        </Typography>
      </Button>
    ),
  }

  const openFilter = {
    key: 'openFilter',
    icon: (
      <IconButton
        onClick={toggleDrawer(true)}
      >
        <Ballot style={{ color: 'white' }} />
      </IconButton>
    ),
  }

  const advMenu = {
    key: 'advMenu',
    icon: (
      <IconButton
        onClick={toggleAdvMenu(true, 'ivAnd')}
      >
        <Menu style={{ color: 'white' }} />
      </IconButton>
    ),
    text: (
      <Button onClick={toggleAdvMenu(true, 'ivAnd')}>
        <Typography variant="caption">
          {text.applyToAll}
        </Typography>
      </Button>
    ),
  }

  const disableAll = {
    key: 'disableAll',
    icon: (
      <IconButton
        onClick={() => selectAllOrNone(false)}
      >
        <Clear color="primary" />
      </IconButton>
    ),
    text: (
      <Button
        onClick={() => selectAllOrNone(false)}
        color="primary"
      >
        <Typography variant="caption">
          {text.disableAll}
        </Typography>
      </Button>
    ),
  }

  const enableAll = {
    key: 'enabledAll',
    icon: (
      <IconButton
        onClick={() => selectAllOrNone(true)}
      >
        <Check style={{ color: '#00e676' }} />
      </IconButton>
    ),
    text: (
      <Button
        onClick={() => selectAllOrNone(true)}
        style={{ color: '#00e676' }}
      >
        <Typography variant="caption">
          {text.enableAll}
        </Typography>
      </Button>
    ),
  }

  const save = {
    key: 'save',
    icon: (
      <IconButton
        onClick={toggleDialog(false, type, tempFilters)}
      >
        <Save color="secondary" />
      </IconButton>
    ),
    text: (
      <Button
        onClick={toggleDialog(false, type, tempFilters)}
        color="secondary"
      >
        <Typography
          variant="caption"
        >
          {text.save}
        </Typography>
      </Button>
    ),
  }

  return (
    <>
      <Dialog
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
            {isMobile ? button.icon : button.text}
          </Grid>
        ))}
      </Grid>
    </>
  )
}
