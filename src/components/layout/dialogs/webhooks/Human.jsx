import React from 'react'
import {
  Grid, Divider, Typography, Select, MenuItem,
} from '@material-ui/core'

import Location from './Location'
import Areas from './Areas'

export default function Human({
  setWebhookMode, handleWebhookChanges, handleLocationChange,
  humanData, profileData, areas, addressFormat, location, map, t,
  selectedAreas, setSelectedAreas, isMobile,
}) {
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
            value={humanData.current_profile_no}
            onChange={(e) => handleWebhookChanges('human', 'current_profile_no', e.target.value)}
          >
            {profileData.map((profile) => (
              <MenuItem key={profile.profile_no} value={profile.profile_no}>{profile.name}</MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
      <Location
        location={location}
        handleLocationChange={handleLocationChange}
        setWebhookMode={setWebhookMode}
        addressFormat={addressFormat}
        t={t}
        map={map}
      />
      <Divider light orientation={isMobile ? 'horizontal' : 'vertical'} flexItem style={isMobile ? { height: 5, width: '100%', margin: '30px 0px' } : null} />
      <Areas
        areas={areas}
        humanData={humanData}
        profileData={profileData}
        t={t}
        setWebhookMode={setWebhookMode}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
      />
    </Grid>
  )
}
