// @ts-check
import * as React from 'react'
import LocationOn from '@mui/icons-material/LocationOn'
import MyLocation from '@mui/icons-material/MyLocation'
import {
  Grid,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
} from '@mui/material'
import { useLazyQuery } from '@apollo/client'
import { useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import Query from '@services/Query'
import Utility from '@services/Utility'
import useLocation from '@hooks/useLocation'
import { useStore } from '@hooks/useStore'

import { setModeBtn, useWebhookStore } from './store'

const Location = ({ syncWebhook }) => {
  const { lc, color } = useLocation()
  const { t } = useTranslation()

  const selectedWebhook = useStore((s) => s.selectedWebhook)

  const webhookLocation = useWebhookStore((s) => s.location)
  const human = useWebhookStore((s) => s.data[selectedWebhook].human)
  const addressFormat = useWebhookStore(
    (s) => s.data[selectedWebhook].addressFormat,
  )
  const hasNominatim = useWebhookStore(
    (s) => s.data[selectedWebhook].hasNominatim,
  )

  const [execSearch, { data, previousData, loading }] = useLazyQuery(
    Query.geocoder(),
    {
      variables: { search: '', name: selectedWebhook },
    },
  )

  /** @param {number[]} location */
  const handleLocationChange = (location) => {
    if (location.length) {
      syncWebhook({
        variables: {
          category: 'setLocation',
          data: location,
          name: selectedWebhook,
          status: 'POST',
        },
      })
    }
  }

  const map = useMapEvents({
    locationfound: (newLoc) => {
      const { location } = useWebhookStore.getState()
      const { lat, lng } = newLoc.latlng
      if (lat !== location[0] && lng !== location[1]) {
        handleLocationChange([lat, lng])
      }
    },
  })

  React.useEffect(() => {
    if (
      webhookLocation[0] !== human.latitude &&
      webhookLocation[1] !== human.longitude
    ) {
      handleLocationChange(webhookLocation)
    }
  }, [webhookLocation])

  // React.useEffect(() => () => lc.stop(), [])

  const fetchedData = data || previousData || { geocoder: [] }
  console.log(webhookLocation)

  return (
    <Grid
      container
      item
      xs={12}
      justifyContent="center"
      alignItems="center"
      spacing={2}
    >
      <Grid item xs={6} sm={3}>
        <Typography variant="h6">{t('location')}</Typography>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Typography variant="body2">
          {webhookLocation.map((x) => x.toFixed(6)).join(', ')}
        </Typography>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => lc._onClick()}
          startIcon={<MyLocation color={color} />}
        >
          {t('my_location')}
        </Button>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={setModeBtn('location')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Autocomplete
          style={{ width: '100%' }}
          getOptionLabel={(option) => Utility.formatter(addressFormat, option)}
          filterOptions={(x) => x}
          options={fetchedData.geocoder}
          autoComplete
          includeInputInList
          freeSolo
          disabled={!hasNominatim}
          onChange={(event, newValue) => {
            if (newValue) {
              const { latitude, longitude } = newValue
              map.panTo([latitude, longitude])
              handleLocationChange([latitude, longitude])
            }
          }}
          renderInput={(params) => (
            <TextField
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...params}
              label={t('search_location')}
              variant="outlined"
              onChange={(e) =>
                execSearch({
                  variables: { search: e.target.value, name: selectedWebhook },
                })
              }
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Grid container alignItems="center" spacing={1} {...props}>
              <Grid item>
                <LocationOn />
              </Grid>
              <Grid item xs>
                <Typography variant="caption">
                  {Utility.formatter(addressFormat, option)}
                </Typography>
              </Grid>
            </Grid>
          )}
        />
      </Grid>
    </Grid>
  )
}

export default Location

// const getEqual = (prev, next) =>
//   prev.webhookLocation.join('') === next.webhookLocation.join('')

// export default memo(Location, getEqual)
