import React, { Fragment, useState, useEffect } from 'react'
import {
  DialogTitle, DialogContent, Typography, Tooltip,
  IconButton, FormControlLabel, TextField,
  Grid, Switch, Button, Divider, Snackbar,
} from '@material-ui/core'
import { Clear, HelpOutline } from '@material-ui/icons'
import { Alert } from '@material-ui/lab'
import { useMutation } from '@apollo/client'
import { useTranslation, Trans } from 'react-i18next'

import useStyles from '@hooks/useStyles'
import { useStatic } from '@hooks/useStore'
import Query from '@services/Query'
import SlideTransition from '@assets/mui/SlideTransition'

const setPayloads = (data, categories) => {
  const payloads = {}
  Object.keys(categories).forEach((category) => {
    if (categories[category]) {
      payloads[category] = { ...data, clean: false, distance: 0 }
    }
  })
  return payloads
}

const dataLookup = (category, entry, Icons, t) => {
  switch (category) {
    case 'gym':
      return {
        id: 'id',
        webhookId: 'gym_id',
        name: entry.name,
        icon: Icons.getGyms(
          entry.team_id,
          6 - entry.availble_slots,
          entry.in_battle,
          entry.ex_raid_eligible,
        ),
      }
    case 'team':
      return {
        id: 'team_id',
        webhookId: 'team',
        name: t(`team_a_${entry.team_id}`),
        icon: Icons.getTeams(entry.team_id),
      }
    case 'egg':
      return {
        id: 'raid_level',
        webhookId: 'level',
        name: t(`e${entry.raid_level}`),
        icon: Icons.getEggs(entry.raid_level),
      }
    case 'raid':
      return {
        id: 'raid_pokemon_id',
        webhookId: 'pokemon_id',
        name: t(`poke_${entry.raid_pokemon_id}`),
        icon: Icons.getPokemon(
          entry.raid_pokemon_id,
          entry.raid_pokemon_form,
          entry.raid_pokemon_evolution,
          entry.raid_pokemon_gender,
          entry.raid_pokemon_costume,
        ),
      }
    default: return ''
  }
}

export default function QuickAdd() {
  const classes = useStyles()
  const { t } = useTranslation()
  const [addWebhook, { data }] = useMutation(Query.webhook())

  const webhookPopup = useStatic(state => state.webhookPopup)
  const setWebhookPopup = useStatic(state => state.setWebhookPopup)
  const webhookData = useStatic(state => state.webhookData)
  const setWebhookData = useStatic(state => state.setWebhookData)
  const Icons = useStatic(state => state.Icons)

  const [payload, setPayload] = useState(setPayloads(webhookPopup.data, webhookPopup.categories))
  const [alert, setAlert] = useState(false)

  const handleChange = (category, event) => {
    const { name, value, checked } = event.target
    setPayload({
      ...payload,
      [category]: {
        ...payload[category],
        [name]: name === 'clean' ? checked : value,
      },
    })
  }

  const handleAlertClose = () => {
    setAlert({ open: false, message: '', severity: 'info' })
  }

  useEffect(() => {
    if (data && data.webhook) {
      setWebhookData({ ...webhookData, ...data.webhook })
      const isOkay = data.webhook.status === 'ok'
      setAlert({
        open: true,
        message: isOkay
          ? t(`webhookSuccess${data.webhook.method}`)
          : <Trans i18nKey="webhookFailed">{{ error: data.webhook.message }}</Trans>,
        severity: isOkay ? 'success' : 'error',
      })
    }
  }, [data])

  console.log(webhookData)

  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t('manageWebhook')}
        <IconButton
          onClick={() => setWebhookPopup({
            open: false, category: '', categories: {}, data: {},
          })}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent className="no-scroll">
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          spacing={2}
        >
          {Object.keys(payload).map((category, i) => {
            const {
              id, name, icon, webhookId,
            } = dataLookup(category, webhookPopup.data, Icons, t)
            const exists = category === 'team'
              ? webhookData.gym.find(entry => entry.gym_id === null && entry.team === payload.gym.team_id)
              : webhookData[category].find(entry => entry[webhookId] === payload[category][id])

            return (
              <Fragment key={category}>
                {i ? <Divider light style={{ width: '100%', margin: 10 }} /> : null}
                <Grid item xs={12} style={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    {exists
                      ? t(`${category}Remove`, `Remove ${category}`)
                      : t(`${category}AddNew`, `Add New ${category}`)}
                  </Typography>
                </Grid>
                <Grid item xs={2} style={{ textAlign: 'left' }}>
                  <img src={icon} style={{ maxHeight: 50, maxWidth: 50 }} />
                </Grid>
                <Grid item xs={6} style={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2">
                    {name}
                  </Typography>
                </Grid>
                <Grid item xs={4} style={{ textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    color={exists ? 'primary' : 'secondary'}
                    onClick={() => addWebhook({
                      variables: {
                        category,
                        data: {
                          ...payload[category],
                          uid: exists ? exists.uid : null,
                        },
                        exists: Boolean(exists),
                      },
                    })}
                  >
                    {exists ? t('remove', 'Remove') : t('add', 'Add')}
                  </Button>
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Switch checked={payload[category].clean} onChange={(e) => handleChange(category, e)} name="clean" />
                    }
                    value={payload[category].clean}
                    label={t('clean', 'Clean')}
                  />
                </Grid>
                <Grid item xs={6} style={{ textAlign: 'center' }}>
                  <TextField
                    onChange={(e) => handleChange(category, e)}
                    name="distance"
                    value={payload[category].distance}
                    label={t('distance', 'Distance')}
                    variant="outlined"
                    margin="dense"
                    size="small"
                    style={{ width: 100 }}
                    type="number"
                    disabled={category === 'gym' || category === 'pokestop'}
                  />
                </Grid>
                <Grid item xs={2}>
                  <Tooltip title={t('help')} enterTouchDelay={0}>
                    <IconButton>
                      <HelpOutline style={{ color: 'white' }} />
                    </IconButton>
                  </Tooltip>
                </Grid>
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
