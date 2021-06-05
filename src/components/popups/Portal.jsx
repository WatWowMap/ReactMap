import React, { Fragment, useState } from 'react'
import { Grid, Typography, IconButton } from '@material-ui/core'
import { Map } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

export default function PortalPopup({ portal, ts }) {
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)
  const { t } = useTranslation()
  const [portalName, setPortalName] = useState(true)
  const {
    url: imageUrl, name, lat, lon, updated, imported,
  } = portal

  const src = imageUrl
    ? imageUrl.replace('http://', 'https://')
    : '/images/misc/pokestop.png'

  const extraMetaData = [
    {
      description: t('lastUpdated'),
      data: Utility.dayCheck(ts, updated),
    },
    {
      description: t('imported'),
      data: Utility.dayCheck(ts, imported),
    },
  ]

  return (
    <Grid
      container
      style={{ width: 200 }}
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Grid item xs={12}>
        <Typography
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          align="center"
          noWrap={portalName}
          onClick={() => setPortalName(!portalName)}
        >
          {name}
        </Typography>
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <a
          href={imageUrl}
          alt={name || 'unknown'}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={src}
            alt={name || 'unknown'}
            className="circle-image"
            style={{
              maxHeight: 150,
              maxWidth: 150,
            }}
          />
        </a>
      </Grid>
      {extraMetaData.map(meta => (
        <Fragment key={meta.description}>
          <Grid item xs={5} style={{ textAlign: 'left' }}>
            <Typography variant="caption" align="center">
              {meta.description}
            </Typography>
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {meta.data}
            </Typography>
          </Grid>
        </Fragment>
      ))}
      <Grid item xs={4} style={{ textAlign: 'center' }}>
        <IconButton
          href={url.replace('{x}', lat).replace('{y}', lon)}
          target="_blank"
          rel="noreferrer"
        >
          <Map style={{ color: 'white' }} />
        </IconButton>
      </Grid>
    </Grid>
  )
}
