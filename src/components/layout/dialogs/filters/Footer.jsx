import React, { useState } from 'react'
import {
  Button, Typography, IconButton, Grid, Dialog,
} from '@material-ui/core'
import {
  Tune, Ballot, Check, Clear, Save, HelpOutline, FormatSize,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import Help from '../help/Filters'

export default function Footer({
  selectAllOrNone, toggleDialog, tempFilters, toggleDrawer, isMobile, toggleAdvMenu, type,
}) {
  const [helpDialog, setHelpDialog] = useState(false)
  const { t } = useTranslation()

  const toggleHelp = () => {
    setHelpDialog(!helpDialog)
  }

  const help = {
    key: 'help',
    icon: (
      <IconButton
        onClick={toggleHelp}
      >
        <HelpOutline />
      </IconButton>
    ),
    text: (
      <Button onClick={toggleHelp}>
        <Typography variant="caption">
          {t('help')}
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
        <Ballot />
      </IconButton>
    ),
  }

  const advMenu = {
    key: 'advMenu',
    icon: (
      <IconButton
        onClick={toggleAdvMenu(true, 'global')}
      >
        {type === 'pokemon' ? <Tune /> : <FormatSize />}
      </IconButton>
    ),
    text: (
      <Button onClick={toggleAdvMenu(true, 'global')}>
        <Typography variant="caption">
          {t('applyToAll')}
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
          {t('disableAll')}
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
          {t('enableAll')}
        </Typography>
      </Button>
    ),
  }

  const save = {
    key: 'save',
    icon: (
      <IconButton
        onClick={toggleDialog(false, type, 'filters', tempFilters)}
      >
        <Save color="secondary" />
      </IconButton>
    ),
    text: (
      <Button
        onClick={toggleDialog(false, type, 'filters', tempFilters)}
        color="secondary"
      >
        <Typography
          variant="caption"
        >
          {t('save')}
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
