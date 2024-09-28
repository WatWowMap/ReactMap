import * as React from 'react'
import LocationOn from '@mui/icons-material/LocationOn'
import MyLocation from '@mui/icons-material/MyLocation'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Unstable_Grid2'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useLazyQuery, useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import { useMapEvents } from 'react-leaflet'
import { SET_HUMAN } from '@services/queries/webhook'
import { WEBHOOK_NOMINATIM } from '@services/queries/geocoder'
import { useLocation } from '@hooks/useLocation'
import { Loading } from '@components/Loading'
import { basicEqualFn } from '@store/useMemory'
import { setModeBtn, useWebhookStore } from '@store/useWebhookStore'

import { useSyncData } from '../hooks/useSyncData'

const Location = () => {
  const { lc, color } = useLocation()
  const { t } = useTranslation()

  const webhookLocation = useWebhookStore((s) => s.location, basicEqualFn)
  const {
    data: { latitude, longitude },
    loading: loadingHuman,
  } = useSyncData('human')
  const hasNominatim = useWebhookStore((s) => !!s.context.hasNominatim)

  const [execSearch, { data, previousData, loading }] = useLazyQuery<{
    geocoder: { latitude: number; longitude: number; formatted: string }[]
  }>(WEBHOOK_NOMINATIM, {
    variables: { search: '' },
  })

  const [save] = useMutation(SET_HUMAN, { fetchPolicy: 'no-cache' })

  const handleLocationChange = (location: [number, number]) => {
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
      alignItems="center"
      justifyContent="center"
      spacing={2}
      xs={12}
    >
      <Grid sm={2} xs={6}>
        <Typography pl={1} variant="h6">
          {t('location')}
        </Typography>
      </Grid>
      <Grid sm={4} textAlign="center" xs={6}>
        <Typography variant="body2">
          {[latitude ?? 0, longitude ?? 0].map((x) => x.toFixed(6)).join(', ')}
        </Typography>
      </Grid>
      <Grid sm={3} textAlign="center" xs={6}>
        <Button
          color={color}
          size="small"
          startIcon={<MyLocation sx={{ color: 'white' }} />}
          variant="contained"
          onClick={() => lc._onClick()}
        >
          {t('my_location')}
        </Button>
      </Grid>
      <Grid sm={3} textAlign="center" xs={6}>
        <Button
          color="primary"
          size="small"
          variant="contained"
          onClick={setModeBtn('location')}
        >
          {t('choose_on_map')}
        </Button>
      </Grid>
      <Grid xs={12}>
        <Autocomplete
          autoComplete
          freeSolo
          includeInputInList
          disabled={!hasNominatim}
          filterOptions={(x) => x}
          getOptionLabel={(option) =>
            typeof option === 'string'
              ? option
              : `${option.formatted} (${option.latitude}, ${option.longitude})`
          }
          options={fetchedData.geocoder}
          renderInput={(params) => (
            <TextField
              {...params}
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
              label={t('search_location')}
              variant="outlined"
            />
          )}
          renderOption={(props, option) => (
            <Typography
              {...props}
              className="flex-center"
              py={1}
              variant="caption"
            >
              <LocationOn sx={{ mx: 2 }} />
              <Box flexGrow={1}>{option.formatted}</Box>
            </Typography>
          )}
          style={{ width: '100%' }}
          onChange={(_, newValue) => {
            if (newValue && typeof newValue !== 'string') {
              const { latitude: lat, longitude: lng } = newValue

              map.panTo([lat, lng])
              handleLocationChange([lat, lng])
            }
          }}
          onInputChange={(_, newValue) =>
            execSearch({ variables: { search: newValue } })
          }
        />
      </Grid>
    </Grid>
  )
}

export const LocationMemo = React.memo(Location, () => true)
