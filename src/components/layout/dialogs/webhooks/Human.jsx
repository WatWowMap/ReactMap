import React, {
  useState, useEffect, memo,
} from 'react'
import {
  Grid, Divider, Typography, Select, MenuItem,
} from '@material-ui/core'
import { useMutation } from '@apollo/client'

import { useStore } from '@hooks/useStore'
import Query from '@services/Query'
import Location from './Location'
import Areas from './Areas'

const Human = ({
  setWebhookMode, t, webhookData, webhookMode,
  selectedAreas, setSelectedAreas, isMobile,
  webhookLocation, setWebhookLocation,
}) => {
  const location = useStore(state => state.location)
  const [syncWebhook, { data: newWebhookData }] = useMutation(Query.webhook('setHuman'))

  const [currentHuman, setCurrentHuman] = useState(webhookData.human)

  useEffect(() => {
    if (newWebhookData && newWebhookData.webhook) {
      setCurrentHuman(newWebhookData.webhook.human)
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
      >
        <Grid item xs={6} sm={3}>
          <Typography>
            {t('selectProfile')}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={5}>
          <Select
            value={currentHuman.current_profile_no}
            onChange={(e) => {
              syncWebhook({
                variables: {
                  category: 'switchProfile',
                  data: e.target.value,
                  status: 'POST',
                },
              })
            }}
          >
            {webhookData.profile.map((profile) => (
              <MenuItem key={profile.profile_no} value={profile.profile_no}>{profile.name}</MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
      <Location
        webhookLocation={webhookLocation}
        setWebhookLocation={setWebhookLocation}
        setWebhookMode={setWebhookMode}
        currentHuman={currentHuman}
        addressFormat={webhookData.addressFormat}
        t={t}
        syncWebhook={syncWebhook}
        webhookMode={webhookMode}
      />
      <Divider light orientation={isMobile ? 'horizontal' : 'vertical'} flexItem style={isMobile ? { height: 5, width: '100%', margin: '30px 0px' } : null} />
      <Areas
        t={t}
        currentHuman={currentHuman}
        webhookData={webhookData}
        setWebhookMode={setWebhookMode}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
        syncWebhook={syncWebhook}
      />
    </Grid>
  )
}

const areEqual = (prev, next) => (
  prev.webhookData.human.current_profile_no === next.webhookData.human.current_profile_no
  && prev.webhookData.human.latitude === next.webhookData.human.latitude
  && prev.webhookData.human.longitude === next.webhookData.human.longitude
  && prev.selectedAreas.length === next.selectedAreas.length
  && prev.webhookData.human.area === next.webhookData.human.area
  && prev.isMobile === next.isMobile
  && prev.webhookLocation.join('') === next.webhookLocation.join('')
  && prev.webhookMode === next.webhookMode
)

export default memo(Human, areEqual)
