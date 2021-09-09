/* eslint-disable no-console */
import React, { Fragment, useState, useEffect } from 'react'
import {
  DialogTitle, DialogContent, useMediaQuery, InputAdornment,
  IconButton, FormControlLabel, Typography, FormControl, FormHelperText,
  Grid, Checkbox, Button, Divider, Snackbar, Tooltip, OutlinedInput,
} from '@material-ui/core'
import {
  Clear, HelpOutline, CheckBox, CheckBoxOutlineBlank,
} from '@material-ui/icons'
import { useTheme } from '@material-ui/styles'
import { Alert } from '@material-ui/lab'
import { useMutation } from '@apollo/client'
import { useTranslation, Trans } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import SlideTransition from '@assets/mui/SlideTransition'

const setStates = (categories, data, webhookData) => {
  try {
    const returnObj = {}
    Object.keys(categories).forEach(category => {
      if (categories[category]) {
        if (data && webhookData && webhookData[category]) {
          const { id, webhookId } = dataLookup(category, data)
          const exists = category === 'team'
            ? webhookData.gym.find(entry => entry.gym_id === null && entry.team === data.gym.team_id) || {}
            : webhookData[category].find(entry => entry[webhookId] === data[id]) || {}

          returnObj[category] = { ...data, clean: Boolean(exists.clean) || false, distance: exists.distance || 0 }
          if (typeof categories[category] === 'object') {
            returnObj[category].subCategories = setStates(categories[category])
          }
        } else {
          returnObj[category] = false
        }
      }
    })
    return returnObj
  } catch (e) {
    console.error(e, data, webhookData)
  }
}

const dataLookup = (category, entry, Icons, t) => {
  try {
    switch (category) {
      case 'gym':
        return {
          id: 'id',
          webhookId: 'gym_id',
          name: entry.name,
          icon: Icons ? Icons.getGyms(
            entry.team_id,
            6 - entry.availble_slots,
          ) : null,
        }
      case 'team':
        return {
          id: 'team_id',
          webhookId: 'team',
          name: t ? t(`team_a_${entry.team_id}`) : null,
          icon: Icons ? Icons.getTeams(entry.team_id) : null,
        }
      case 'egg':
        return {
          id: 'raid_level',
          webhookId: 'level',
          name: t ? t(`e${entry.raid_level}`) : null,
          icon: Icons ? Icons.getEggs(entry.raid_level) : null,
        }
      case 'raid':
        return {
          id: 'raid_pokemon_id',
          webhookId: 'pokemon_id',
          name: t ? t(`poke_${entry.raid_pokemon_id}`) : null,
          icon: Icons ? Icons.getPokemon(
            entry.raid_pokemon_id,
            entry.raid_pokemon_form,
            entry.raid_pokemon_evolution,
            entry.raid_pokemon_gender,
            entry.raid_pokemon_costume,
          ) : null,
        }
      default: return ''
    }
  } catch (e) {
    console.warn(e, category, entry)
  }
}

const getStatus = (exists, local) => {
  try {
    if (exists && Boolean(exists.clean) === local.clean && exists.distance === local.distance) {
      return 'DELETE'
    }
    if (exists && (Boolean(exists.clean) !== local.clean || exists.distance !== local.distance)) {
      return 'PATCH'
    }
    return 'POST'
  } catch (e) {
    console.error(e, exists, local)
  }
}

export default function QuickAdd({ config }) {
  const classes = useStyles()
  const theme = useTheme()
  const { t } = useTranslation()
  const [addWebhook, { data }] = useMutation(Query.webhook())

  const webhookPopup = useStatic(state => state.webhookPopup)
  const setWebhookPopup = useStatic(state => state.setWebhookPopup)
  const webhookData = useStatic(state => state.webhookData)
  const setWebhookData = useStatic(state => state.setWebhookData)
  const Icons = useStatic(state => state.Icons)

  const [payloads, setPayloads] = useState(setStates(webhookPopup.categories, webhookPopup.data, webhookData))
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' })
  const [distances, setDistances] = useState(setStates(webhookPopup.categories))
  const [helpTooltip, setHelpTooltip] = useState(false)
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))

  const handleChange = (category, event) => {
    const { name, value, checked } = event.target
    setPayloads({
      ...payloads,
      [category]: {
        ...payloads[category],
        [name]: name === 'clean' ? checked : value,
      },
    })
  }

  const handleAlertClose = () => {
    setAlert({ open: false, message: '', severity: 'info' })
  }

  const handleDistance = (category) => {
    setDistances({ ...distances, [category]: !distances[category] })
    setPayloads({
      ...payloads,
      [category]: {
        ...payloads[category],
        distance: payloads[category].distance === 0 ? 1 : 0,
      },
    })
  }

  useEffect(() => {
    if (data && data.webhook) {
      console.log('incoming data', data)
      const { status, message, category } = data.webhook
      setWebhookData({ ...webhookData, [category]: data.webhook[category] })
      setAlert({
        open: true,
        message: message ? message.replace(/\*/g, '') : '',
        severity: status === 'ok' ? 'success' : 'error',
      })
    }
  }, [data])

  console.log('payloads', payloads, webhookData)
  console.log('new webhook data', webhookData)
  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        <Trans i18nKey="manageWebhook">
          {{ name: config.webhook }}
        </Trans>
        <Tooltip
          title={t('help')}
          PopperProps={{
            disablePortal: true,
          }}
          onClose={() => setHelpTooltip(false)}
          enterTouchDelay={0}
          open={helpTooltip}
        >
          <IconButton onClick={() => setHelpTooltip(true)}>
            <HelpOutline style={{ color: 'white' }} />
          </IconButton>
        </Tooltip>
        <IconButton
          onClick={() => setWebhookPopup({ ...webhookPopup, open: false })}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          spacing={2}
        >
          {Object.keys(payloads).map((category, i) => {
            const {
              id, name, icon, webhookId,
            } = dataLookup(category, webhookPopup.data, Icons, t)
            const exists = category === 'team'
              ? webhookData.gym.find(entry => entry.gym_id === null && entry.team === payloads.gym.team_id)
              : webhookData[category].find(entry => entry[webhookId] === payloads[category][id])
            const isGlobal = category === 'gym' || category === 'pokestop'

            const status = getStatus(exists, payloads[category])
            console.log(exists)
            const clean = (
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox checked={payloads[category].clean} onChange={(e) => handleChange(category, e)} name="clean" />
                  }
                  value={payloads[category].clean}
                  label={t('clean', 'Clean')}
                />
              </Grid>
            )
            return (
              <Fragment key={category}>
                {i ? <Divider light style={{ width: '100%', margin: 10 }} /> : null}
                <Grid item xs={3} sm={2} style={{ textAlign: 'left' }}>
                  <img src={icon} style={{ maxHeight: 40, maxWidth: 40 }} />
                </Grid>
                <Grid item xs={9} sm={6} style={{ textAlign: 'left' }}>
                  <Typography variant={name.length > 20 ? 'subtitle2' : 'h6'}>
                    {name}
                  </Typography>
                </Grid>
                {isMobile ? clean : null}
                <Grid item xs={6} sm={4} style={{ textAlign: 'center' }}>
                  <Button
                    classes={{
                      containedSizeSmall: status === 'PATCH' ? classes.modifyWebhook : null,
                    }}
                    variant="contained"
                    color={exists ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => addWebhook({
                      variables: {
                        category,
                        data: {
                          ...payloads[category],
                          uid: exists ? exists.uid : null,
                        },
                        status,
                      },
                    })}
                  >
                    <Trans i18nKey={`${status}webhook`}>
                      {{ category }}
                    </Trans>
                  </Button>
                </Grid>
                {isMobile ? null : clean}
                {isGlobal ? (
                  <Grid container item xs={12} sm={9} spacing={2} justifyContent="center" alignItems="center">
                    {Object.keys(payloads[category].subCategories).map(subCategory => (
                      <Grid
                        item
                        xs={12 / Math.round(Object.keys(payloads[category].subCategories).length)}
                        key={`${category}-${subCategory}`}
                      >
                        <FormControlLabel
                          classes={{
                            label: classes.quickAddCheckbox,
                          }}
                          control={(
                            <Checkbox
                              icon={<CheckBoxOutlineBlank fontSize="small" />}
                              checkedIcon={<CheckBox fontSize="small" />}
                              checked={payloads[category].subCategories[subCategory]}
                              onChange={() => setPayloads({
                                ...payloads,
                                [category]: {
                                  ...payloads[category],
                                  subCategories: {
                                    ...payloads[category].subCategories,
                                    [subCategory]: !payloads[category].subCategories[subCategory],
                                  },
                                },
                              })}
                              name={subCategory}
                            />
                          )}
                          value={payloads[category].subCategories[subCategory]}
                          label={t(subCategory)}
                          style={{ textAlign: 'center', fontSize: 1 }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={6} sm={4}>
                      <FormControlLabel
                        control={<Checkbox checked={distances[category]} onChange={() => handleDistance(category)} name="setDistance" />}
                        value={payloads[category].clean}
                        label={t('distance', 'Distance')}
                      />
                    </Grid>
                    <Grid item xs={6} sm={4} style={{ textAlign: 'center' }}>
                      {distances[category] ? (
                        <FormControl variant="outlined">
                          <OutlinedInput
                            id="distance"
                            name="distance"
                            value={payloads[category].distance}
                            onChange={(e) => handleChange(category, e)}
                            endAdornment={<InputAdornment position="end">m</InputAdornment>}
                            aria-describedby="setDistance"
                            type="number"
                            margin="dense"
                            size="small"
                            disabled={!distances[category]}
                            inputProps={{
                              min: 1,
                              'aria-label': 'distance',
                            }}
                            labelWidth={0}
                          />
                          <FormHelperText id="setDistance">{t('setDistance', 'Set Distance')}</FormHelperText>
                        </FormControl>
                      ) : (
                        <Typography>
                          {t('trackByArea', 'Track By Areas')}
                        </Typography>
                      )}
                    </Grid>
                  </>
                )}
              </Fragment>
            )
          })}
        </Grid>
      </DialogContent>
      <Snackbar
        open={Boolean(data) && alert.open}
        onClose={handleAlertClose}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alert.severity}
          variant="filled"
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  )
}
