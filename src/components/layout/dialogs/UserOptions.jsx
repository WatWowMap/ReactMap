import React, { Fragment, useState } from 'react'
import {
  Grid,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Switch,
  Input,
  useMediaQuery,
} from '@material-ui/core'
import { Clear, Replay, Save } from '@material-ui/icons'
import { useTheme } from '@material-ui/styles'
import { useTranslation } from 'react-i18next'

import { useStatic, useStore } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'

export default function UserOptions({ category, toggleDialog }) {
  const theme = useTheme()
  const classes = useStyles()
  const { t } = useTranslation()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  const { [category]: staticUserSettings } = useStatic(state => state.userSettings)
  const userSettings = useStore(state => state.userSettings)
  const [localState, setLocalState] = useState(userSettings[category])

  const reset = {
    key: 'reset',
    icon: (
      <IconButton onClick={() => setLocalState(userSettings[category])}>
        <Replay color="primary" />
      </IconButton>
    ),
    text: (
      <Button onClick={() => setLocalState(userSettings[category])}>
        <Typography variant="caption" color="primary">
          {t('reset')}
        </Typography>
      </Button>
    ),
  }
  const save = {
    key: 'save',
    icon: (
      <IconButton
        onClick={toggleDialog(false, category, 'options', localState)}
      >
        <Save color="secondary" />
      </IconButton>
    ),
    text: (
      <Button
        onClick={toggleDialog(false, category, 'options', localState)}
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

  const handleChange = event => {
    const { name, value } = event.target
    if (value) {
      setLocalState({ ...localState, [name]: value })
    } else {
      setLocalState({ ...localState, [name]: !localState[name] })
    }
  }

  const getInputType = (option, subOption) => {
    const fullOption = subOption
      ? staticUserSettings[option].sub[subOption] : staticUserSettings[option]

    switch (fullOption.type) {
      default: return (
        <Grid item xs={3} style={{ textAlign: 'right' }}>
          <Input
            color="secondary"
            id={subOption || option}
            label={subOption || option}
            name={subOption || option}
            style={{ width: 50 }}
            value={localState[subOption || option]}
            onChange={handleChange}
            variant="outlined"
            size="small"
            type={fullOption.type}
            disabled={fullOption.disabled}
            endAdornment={fullOption.label || ''}
            inputProps={{
              min: 0,
              max: 100,
            }}
          />
        </Grid>
      )
      case 'bool': return (
        <Grid item xs={3} style={{ textAlign: 'right' }}>
          <Switch
            color="secondary"
            checked={localState[subOption || option]}
            name={subOption || option}
            onChange={handleChange}
            disabled={fullOption.disabled}
          />
        </Grid>
      )
    }
  }

  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t(`${category}Options`)}
        <IconButton
          onClick={toggleDialog(false, category, 'options')}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {Object.entries(staticUserSettings).map(option => {
          const [key, values] = option
          return (
            <Grid
              container
              key={key}
              direction="row"
              justify="center"
              alignItems="center"
              style={{ width: 250 }}
              spacing={2}
            >
              <Grid item xs={9}>
                <Typography variant="body1">
                  {t(key)}
                </Typography>
              </Grid>
              {getInputType(key)}
              {values.sub
                && Object.keys(values.sub).map(subOption => (
                  <Fragment key={subOption}>
                    <Grid item xs={9}>
                      <Typography variant="body1">
                        {t(subOption)}
                      </Typography>
                    </Grid>
                    {getInputType(key, subOption)}
                  </Fragment>
                ))}
            </Grid>
          )
        })}
      </DialogContent>
      <DialogActions>
        {[reset, save].map(button => (
          <Fragment key={button.key}>
            {isMobile ? button.icon : button.text}
          </Fragment>
        ))}
      </DialogActions>
    </>
  )
}
