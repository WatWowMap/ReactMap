// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

import Navigation from '@components/popups/Navigation'
import Coords from '@components/popups/Coords'

/**
 *
 * @param {import('@rm/types').Portal} props
 * @returns
 */
export function PortalPopup({ url, name, lat, lon, updated, imported }) {
  const { t } = useTranslation()
  const Icons = useMemory((s) => s.Icons)
  const enablePortalPopupCoords = useStorage(
    (s) => s.userSettings?.wayfarer?.enablePortalPopupCoords,
  )

  const [portalName, setPortalName] = React.useState(true)

  const src = url ? url.replace('http://', 'https://') : Icons.getMisc('portal')

  const extraMetaData = [
    {
      description: t('last_updated'),
      data: Utility.dayCheck(Date.now() / 1000, updated),
    },
    {
      description: t('imported'),
      data: Utility.dayCheck(Date.now() / 1000, imported),
    },
  ]

  React.useEffect(() => {
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
          <a href={url} target="_blank" rel="noreferrer">
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
            <React.Fragment key={meta.description}>
              <Typography variant="subtitle1" style={{ textAlign: 'center' }}>
                {meta.description}
              </Typography>
              <Typography variant="caption" style={{ textAlign: 'center' }}>
                {meta.data}
              </Typography>
            </React.Fragment>
          ))}
        </Grid>
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <Navigation lat={lat} lon={lon} />
        </Grid>
        {enablePortalPopupCoords && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Coords lat={lat} lon={lon} />
          </Grid>
        )}
      </Grid>
    </ErrorBoundary>
  )
}
