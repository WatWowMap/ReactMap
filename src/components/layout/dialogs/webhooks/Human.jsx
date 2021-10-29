import React, {
  useState, useEffect, memo,
} from 'react'
import {
  Grid, Divider, Typography, Select, MenuItem,
} from '@material-ui/core'
import { useMutation } from '@apollo/client'
import { Trans } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Query from '@services/Query'

import Location from './Location'
import Areas from './Areas'

const Human = ({
  webhookMode, setWebhookMode,
  selectedAreas, setSelectedAreas,
  selectedWebhook, setSelectedWebhook,
  webhookLocation, setWebhookLocation,
  isMobile, t, webhookData, setWebhookData,
  setWebhookAlert,
}) => {
  const { perms } = useStatic(s => s.auth)
  const location = useStore(s => s.location)
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook('setHuman'))

  const [currentHuman, setCurrentHuman] = useState(webhookData[selectedWebhook].human)

  useEffect(() => {
    if (newWebhookData?.webhook) {
      if (newWebhookData.webhook.status === 'error') {
        setWebhookAlert({
          open: true,
          severity: newWebhookData.webhook.status,
          message: <Trans i18nKey={newWebhookData.webhook.message}>{{ name: selectedWebhook }}</Trans>,
        })
      } else if (newWebhookData.webhook.human) {
        setCurrentHuman(newWebhookData.webhook.human)
      }
    }
  }, [newWebhookData])

  useEffect(() => {
    const { latitude, longitude, area } = currentHuman
    if (parseFloat(latitude) || parseFloat(longitude)) {
      setWebhookLocation([latitude, longitude])
    } else {
      setWebhookLocation(location)
    }
    setSelectedAreas(JSON.parse(area))
  }, [currentHuman])

  useEffect(() => () => setWebhookData({
    ...webhookData,
    [selectedWebhook]: {
      ...webhookData[selectedWebhook],
      human: currentHuman,
    },
  }))

  return (
    <Grid
      container
      justifyContent="flex-start"
      alignItems="center"
      spacing={2}
    >
      <Grid
        container
        item
        xs={12}
        justifyContent="flex-start"
        alignItems="center"
        spacing={2}
      >
        <Grid item xs={6} sm={3}>
          <Typography variant="h6">
            {t('selectProfile')}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
          <Select
            value={webhookData[selectedWebhook].profile.length
              ? currentHuman.current_profile_no
              : ''}
            onChange={(e) => {
              syncWebhook({
                variables: {
                  category: 'switchProfile',
                  data: e.target.value,
                  status: 'POST',
                  name: selectedWebhook,
                },
              })
            }}
            style={{ minWidth: 100 }}
          >
            {webhookData[selectedWebhook].profile.map((profile) => (
              <MenuItem key={profile.profile_no} value={profile.profile_no}>{profile.name}</MenuItem>
            ))}
          </Select>
        </Grid>
        {perms.webhooks.length > 1 && (
          <>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6">
                {t('selectWebhook')}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
              <Select
                value={selectedWebhook}
                onChange={(e) => setSelectedWebhook(e.target.value)}
                style={{ minWidth: 100 }}
              >
                {perms.webhooks.map((webhook) => (
                  <MenuItem key={webhook} value={webhook}>{webhook}</MenuItem>
                ))}
              </Select>
            </Grid>
          </>
        )}
        <Divider
          light
          flexItem
          style={{ height: 5, width: '100%', margin: '15px 0px' }}
        />
      </Grid>
      <Location
        webhookLocation={webhookLocation}
        setWebhookLocation={setWebhookLocation}
        setWebhookMode={setWebhookMode}
        currentHuman={currentHuman}
        addressFormat={webhookData[selectedWebhook].addressFormat}
        t={t}
        syncWebhook={syncWebhook}
        webhookMode={webhookMode}
        selectedWebhook={selectedWebhook}
      />
      <Divider
        light
        flexItem
        style={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
      {webhookData[selectedWebhook].areas.status !== false ? (
        <Areas
          t={t}
          webhookData={webhookData[selectedWebhook]}
          setWebhookMode={setWebhookMode}
          selectedAreas={selectedAreas}
          syncWebhook={syncWebhook}
          webhookMode={webhookMode}
          selectedWebhook={selectedWebhook}
          currentHuman={currentHuman}
          isMobile={isMobile}
        />
      ) : <Typography>{`Invalid Area File Received from ${selectedWebhook}`}</Typography>}
    </Grid>
  )
}

const areEqual = (prev, next) => {
  const prevSelected = prev.webhookData[prev.selectedWebhook]
  const nextSelected = next.webhookData[next.selectedWebhook]
  return (
    prev.selectedWebhook === next.selectedWebhook
    && prevSelected.human.current_profile_no === nextSelected.human.current_profile_no
    && prevSelected.human.latitude === nextSelected.human.latitude
    && prevSelected.human.longitude === nextSelected.human.longitude
    && prevSelected.human.area === nextSelected.human.area
    && prev.selectedAreas.length === next.selectedAreas.length
    && prev.isMobile === next.isMobile
    && prev.webhookLocation.join('') === next.webhookLocation.join('')
    && prev.webhookMode === next.webhookMode
  )
}

export default memo(Human, areEqual)
