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
import { useLazyQuery, useMutation } from '@apollo/client'
import { useMapEvents } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import { setHuman } from '@services/queries/webhook'
import { WEBHOOK_NOMINATIM } from '@services/queries/geocoder'
import useLocation from '@hooks/useLocation'

import { setModeBtn, useWebhookStore } from './store'

const Location = () => {
  const { lc, color } = useLocation()
  const { t } = useTranslation()

  // const location = useWebhookStore((s) => s.location)
  const webhookLocation = useWebhookStore((s) => s.location)
  const latitude = useWebhookStore((s) => s.human.latitude || 0)
  const longitude = useWebhookStore((s) => s.human.longitude || 0)
  const addressFormat = useWebhookStore((s) => s.context.addressFormat || '')
  const hasNominatim = useWebhookStore((s) => !!s.context.hasNominatim)

  const [execSearch, { data, previousData, loading }] = useLazyQuery(
    WEBHOOK_NOMINATIM,
    {
      variables: { search: '' },
    },
  )

  const [save] = useMutation(setHuman, { fetchPolicy: 'no-cache' })

  /** @param {number[]} location */
  const handleLocationChange = (location) => {
    if (location.length) {
      save({
        variables: {
          category: 'setLocation',
          data: location,
          status: 'POST',
        },
      })
    }
  }

  React.useEffect(() => {
    if (webhookLocation[0] !== latitude && webhookLocation[1] !== longitude) {
      handleLocationChange(webhookLocation)
    }
  }, [webhookLocation])

  // React.useEffect(() => () => lc.stop(), [])

  const fetchedData = data || previousData || { geocoder: [] }
  console.log(fetchedData, addressFormat)

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
          {[latitude, longitude].map((x) => x.toFixed(6)).join(', ')}
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
          getOptionLabel={(option) =>
            `${option.formatted} (${option.latitude}, ${option.longitude})`
          }
          filterOptions={(x) => x}
          options={fetchedData.geocoder}
          autoComplete
          includeInputInList
          freeSolo
          disabled={!hasNominatim}
          onChange={(event, newValue) => {
            if (newValue) {
              console.log({ newValue })
              const { latitude: lat, longitude: lng } = newValue
              map.panTo([lat, lng])
              useWebhookStore.setState({ location: [lat, lng] })
            }
          }}
          renderInput={(params) => (
            <TextField
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...params}
              label={t('search_location')}
              variant="outlined"
              onChange={(e) =>
                execSearch({ variables: { search: e.target.value } })
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
            <Grid container alignItems="center" {...props}>
              <Grid item>
                <LocationOn />
              </Grid>
              <Grid item xs>
                <Typography variant="caption">{option.formatted}</Typography>
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
