// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Edit from '@mui/icons-material/Edit'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { Query } from '@services/queries'
import { VirtualGrid } from '@components/virtual/VirtualGrid'
import { Img } from '@components/Img'
import { ToggleTypography } from '@components/ToggleTypography'

export function UserGymBadges() {
  const { t } = useTranslation()
  /** @type {import('@apollo/client').QueryResult<{ badges: import('@rm/types').Gym[] }>} */
  const { data } = useQuery(Query.gyms('badges'), {
    fetchPolicy: 'network-only',
  })

  const counts = React.useMemo(() => {
    const counter = { bronze: 0, silver: 0, gold: 0 }

    if (data?.badges) {
      data.badges.forEach((gym) => {
        switch (gym.badge) {
          case 3:
            counter.gold += 1
            break
          case 2:
            counter.silver += 1
            break
          case 1:
            counter.bronze += 1
            break
          default:
        }
      })
    }
    return counter
  }, [data])

  return data ? (
    <Box className="gym-badge-grid">
      <Typography variant="h5" align="center" gutterBottom>
        {t('gym_badges')}
      </Typography>
      <Grid container pt={1} pb={2}>
        {Object.entries(counts).map(([key, count], i) => (
          <Grid key={key} xs={4}>
            <Typography
              variant="subtitle2"
              align="center"
              className={`badge_${i + 1}`}
            >
              {t(`badge_${i + 1}`)}: {count}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <VirtualGrid data={data?.badges || []} xs={4} md={3}>
        {(_, badge) => <BadgeTile {...badge} />}
      </VirtualGrid>
    </Box>
  ) : null
}

/** @param {import('@rm/types').Gym} props */
function BadgeTile({ badge, ...gym }) {
  const { t } = useTranslation()
  const map = useMap()
  const badgeIcon = useMemory((s) => s.Icons.getMisc(`badge_${badge}`))

  return badge ? (
    <Box className="vgrid-item" minHeight={200}>
      <IconButton
        className="vgrid-icon"
        disabled={gym.deleted}
        size="small"
        onClick={() =>
          useLayoutStore.setState({
            gymBadge: { badge, gymId: gym.id, open: true },
          })
        }
      >
        <Edit />
      </IconButton>
      <Button
        className="vgrid-image"
        onClick={() => map.flyTo([gym.lat, gym.lon], 16)}
        disabled={gym.deleted}
      >
        <Img
          className="badge-diamond"
          src={gym.url ? gym.url.replace('http://', 'https://') : ''}
          alt={gym.url}
          height={120}
          width={120}
        />
        {gym.deleted && <div className="disabled-overlay badge-diamond" />}
        {badge && (
          <Img
            src={badgeIcon}
            alt={t(`badge_${badge}`)}
            width={96}
            zIndex={10}
          />
        )}
      </Button>
      <ToggleTypography
        className="vgrid-caption"
        variant="caption"
        color={gym.deleted ? 'GrayText' : 'inherit'}
      >
        {gym.name || t('unknown_gym')}
      </ToggleTypography>
    </Box>
  ) : null
}
