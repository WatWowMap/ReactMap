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
  Box,
} from '@mui/material'
import { useLazyQuery, useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import { useMapEvents } from 'react-leaflet'

import { setHuman } from '@services/queries/webhook'
import { WEBHOOK_NOMINATIM } from '@services/queries/geocoder'
import useLocation from '@hooks/useLocation'
import { Loading } from '@components/general/Loading'
import { basicEqualFn } from '@hooks/useMemory'

import { setModeBtn, useWebhookStore } from '../store'
import { useSyncData } from '../hooks'

const Location = () => {
  const { lc, color } = useLocation()
  const { t } = useTranslation()

  const webhookLocation = useWebhookStore((s) => s.location, basicEqualFn)
  const {
    data: { latitude, longitude },
    loading: loadingHuman,
  } = useSyncData('human')
  const hasNominatim = useWebhookStore((s) => !!s.context.hasNominatim)

  const [execSearch, { data, previousData, loading }] = useLazyQuery(
    WEBHOOK_NOMINATIM,
    {
      variables: { search: '' },
    },
  )

  const [save] = useMutation(setHuman, { fetchPolicy: 'no-cache' })

  /** @param {[number, number]} location */
  const handleLocationChange = (location) => {
    if (location.every((x) => x !== 0)) {
      useWebhookStore.setState((prev) => ({
        location: prev.location.some((x, i) => x !== location[i])
          ? [location[0] ?? 0, location[1] ?? 0]
          : prev.location,
      }))
      save({
        variables: {
          category: 'setLocation',
          data: location,
          status: 'POST',
        },
      }).then(({ data: newData }) => {
        if (newData?.webhook) {
          useWebhookStore.setState({ human: newData.webhook.human })
        }
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
    if (webhookLocation[0] !== latitude && webhookLocation[1] !== longitude) {
      handleLocationChange(webhookLocation)
    }
  }, [webhookLocation])

  React.useEffect(() => {
    if (webhookLocation.every((x) => x === 0)) {
      useWebhookStore.setState({ location: [latitude, longitude] })
    }
  }, [latitude, longitude])

  React.useEffect(
    () => () => {
      lc.stop()
      useWebhookStore.setState({ location: [0, 0] })
    },
    [],
  )

  const fetchedData = data || previousData || { geocoder: [] }

  return loadingHuman ? (
    <Loading>{t('loading', { category: t('location') })}</Loading>
  ) : (
    <Grid
      container
      item
      xs={12}
      justifyContent="center"
      alignItems="center"
      spacing={2}
    >
      <Grid item xs={6} sm={2}>
        <Typography variant="h6" pl={1}>
          {t('location')}
        </Typography>
      </Grid>
      <Grid item xs={6} sm={4} style={{ textAlign: 'center' }}>
        <Typography variant="body2">
          {[latitude ?? 0, longitude ?? 0].map((x) => x.toFixed(6)).join(', ')}
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
          onInputChange={(_, newValue) =>
            execSearch({ variables: { search: newValue } })
          }
          onChange={(_, newValue) => {
            if (newValue) {
              const { latitude: lat, longitude: lng } = newValue
              map.panTo([lat, lng])
              handleLocationChange([lat, lng])
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('search_location')}
              variant="outlined"
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
            <Typography
              {...props}
              className="flex-center"
              variant="caption"
              py={1}
            >
              <LocationOn sx={{ mx: 2 }} />
              <Box flexGrow={1}>{option.formatted}</Box>
            </Typography>
          )}
        />
      </Grid>
    </Grid>
  )
}

const LocationMemo = React.memo(Location, () => true)

export default LocationMemo
