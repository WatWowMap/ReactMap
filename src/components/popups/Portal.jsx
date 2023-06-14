import React, { Fragment, useState, useEffect } from 'react'
import { Grid, Typography } from '@material-ui/core'

import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'
import Navigation from './common/Navigation'

export default function PortalPopup({ portal, config, ts, Icons }) {
  const { t } = useTranslation()
  const [portalName, setPortalName] = useState(true)
  const { url: imageUrl, name, lat, lon, updated, imported } = portal

  const src = imageUrl
    ? imageUrl.replace('http://', 'https://')
    : Icons.getMisc('portal')

  const extraMetaData = [
    {
      description: t('last_updated'),
      data: Utility.dayCheck(ts, updated),
    },
    {
      description: t('imported'),
      data: Utility.dayCheck(ts, imported),
    },
  ]

  useEffect(() => {
    Utility.analytics('Popup', `Name: ${name}`, 'Portal')
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        style={{ width: 200 }}
        direction="row"
        justifyContent="space-evenly"
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
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          {extraMetaData.map((meta) => (
            <Fragment key={meta.description}>
              <Typography variant="subtitle1" style={{ textAlign: 'center' }}>
                {meta.description}
              </Typography>
              <Typography variant="caption" style={{ textAlign: 'center' }}>
                {meta.data}
              </Typography>
            </Fragment>
          ))}
        </Grid>
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <Navigation lat={lat} lon={lon} />
        </Grid>
        {config.enablePortalPopupCoords && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Typography variant="caption" style={{ textAlign: 'center' }}>
              🎯 {portal.lat}, {portal.lon}
            </Typography>
          </Grid>
        )}
      </Grid>
    </ErrorBoundary>
  )
}
