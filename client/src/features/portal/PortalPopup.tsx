import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@components/ErrorBoundary'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { dayCheck } from '@utils/dayCheck'
import { useAnalytics } from '@hooks/useAnalytics'

export function PortalPopup({
  url,
  name,
  lat,
  lon,
  updated,
  imported,
}: import('@rm/types').Portal) {
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
      data: dayCheck(Date.now() / 1000, updated),
    },
    {
      description: t('imported'),
      data: dayCheck(Date.now() / 1000, imported),
    },
  ]

  useAnalytics('Popup', `Name: ${name}`, 'Portal')

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
        <Grid xs={12}>
          <Typography
            variant={name.length > 20 ? 'subtitle2' : 'h6'}
            align="center"
            noWrap={portalName}
            onClick={() => setPortalName(!portalName)}
          >
            {name}
          </Typography>
        </Grid>
        <Grid xs={12} textAlign="center">
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
        <Grid xs={12} textAlign="center">
          {extraMetaData.map((meta) => (
            <React.Fragment key={meta.description}>
              <Typography variant="subtitle1" textAlign="center">
                {meta.description}
              </Typography>
              <Typography variant="caption" textAlign="center">
                {meta.data}
              </Typography>
            </React.Fragment>
          ))}
        </Grid>
        <Grid xs={4} textAlign="center">
          <Navigation lat={lat} lon={lon} />
        </Grid>
        {enablePortalPopupCoords && (
          <Grid xs={12} textAlign="center">
            <Coords lat={lat} lon={lon} />
          </Grid>
        )}
      </Grid>
    </ErrorBoundary>
  )
}
