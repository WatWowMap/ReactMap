import React, { useEffect, useState } from 'react'
import {
  Grid, Button, TextField, Typography, CircularProgress,
} from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'
import { LocationOn } from '@material-ui/icons'
import { useQuery } from '@apollo/client'

import Query from '@services/Query'
import Utility from '@services/Utility'
import useLocation from '@hooks/useLocation'

export default function Location({
  location, handleLocationChange, setWebhookMode, addressFormat, t, map,
}) {
  const { lc, color } = useLocation(map)
  const [search, setSearch] = useState(location.join(', '))
  const { data, previousData, loading } = useQuery(Query.geocoder(), {
    variables: { search },
  })

  useEffect(() => () => lc._deactivate(), [])
  const fetchedData = data || previousData
  return (
    <Grid
      container
      item
      xs={12}
      sm={6}
      justifyContent="center"
      alignItems="center"
      spacing={2}
    >
      <Grid item xs={6} sm={4}>
        <Typography variant="h6">
          {t('location')}:
        </Typography>
      </Grid>
      <Grid item xs={6} sm={8}>
        <Typography variant="subtitle2">
          {location.map(x => x.toFixed(8)).join(', ')}
        </Typography>
      </Grid>
      <Grid item xs={6} sm={6} style={{ textAlign: 'right' }}>
        <Button size="small" variant="contained" color="secondary" onClick={() => lc._onClick()} startIcon={<LocationOn color={color} />}>
          {t('myLocation')}
        </Button>
      </Grid>
      <Grid item xs={6} sm={6} style={{ textAlign: 'right' }}>
        <Button size="small" variant="contained" color="primary" onClick={() => setWebhookMode('location')}>
          {t('chooseOnMap')}
        </Button>
      </Grid>
      <Grid item xs={12} sm={12}>
        {(fetchedData && fetchedData.geocoder) ? (
          <Autocomplete
            style={{ width: '100%' }}
            getOptionLabel={(option) => Utility.formatter(addressFormat, option)}
            filterOptions={(x) => x}
            options={fetchedData.geocoder}
            autoComplete
            includeInputInList
            freeSolo
            onChange={(event, newValue) => {
              if (newValue) {
                handleLocationChange(newValue, true)
              }
            }}
            renderInput={(params) => (
              <TextField
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...params}
                label="Search"
                variant="outlined"
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(option) => (
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <LocationOn style={{ color: 'white' }} />
                </Grid>
                <Grid item xs>
                  <Typography variant="caption">
                    {Utility.formatter(addressFormat, option)}
                  </Typography>
                </Grid>
              </Grid>
            )}
          />
        ) : null}
      </Grid>
    </Grid>
  )
}
