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
        alignItems="center"
        direction="row"
        justifyContent="space-evenly"
        spacing={1}
        style={{ width: 200 }}
      >
        <Grid xs={12}>
          <Typography
            align="center"
            noWrap={portalName}
            variant={name.length > 20 ? 'subtitle2' : 'h6'}
            onClick={() => setPortalName(!portalName)}
          >
            {name}
          </Typography>
        </Grid>
        <Grid textAlign="center" xs={12}>
          <a href={url} rel="noreferrer" target="_blank">
            <img
              alt={name || 'unknown'}
              className="circle-image"
              src={src}
              style={{
                maxHeight: 150,
                maxWidth: 150,
              }}
            />
          </a>
        </Grid>
        <Grid textAlign="center" xs={12}>
          {extraMetaData.map((meta) => (
            <React.Fragment key={meta.description}>
              <Typography textAlign="center" variant="subtitle1">
                {meta.description}
              </Typography>
              <Typography textAlign="center" variant="caption">
                {meta.data}
              </Typography>
            </React.Fragment>
          ))}
        </Grid>
        <Grid textAlign="center" xs={4}>
          <Navigation lat={lat} lon={lon} />
        </Grid>
        {enablePortalPopupCoords && (
          <Grid textAlign="center" xs={12}>
            <Coords lat={lat} lon={lon} />
          </Grid>
        )}
      </Grid>
    </ErrorBoundary>
  )
}
