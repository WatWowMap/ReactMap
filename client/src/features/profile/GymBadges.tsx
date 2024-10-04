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
  const { data } = useQuery<{ badges: import('@rm/types').Gym[] }>(
    Query.gyms('badges'),
    {
      fetchPolicy: 'network-only',
    },
  )

  const counts = React.useMemo(() => {
    const counter = { basic: 0, bronze: 0, silver: 0, gold: 0 }

    if (data?.badges) {
      data.badges.forEach((gym) => {
        switch (gym.badge) {
          case 4:
            counter.gold += 1
            break
          case 3:
            counter.silver += 1
            break
          case 2:
            counter.bronze += 1
            break
          case 1:
            counter.basic += 1
            break
          default:
        }
      })
    }

    return counter
  }, [data])

  return data ? (
    <Box className="gym-badge-grid">
      <Typography gutterBottom align="center" variant="h5">
        {t('gym_badges')}
      </Typography>
      <Grid container pb={2} pt={1}>
        {Object.entries(counts).map(([key, count], i) => (
          <Grid key={key} xs={3}>
            <Typography
              align="center"
              className={`badge_${i + 1}`}
              variant="subtitle2"
            >
              {t(`badge_${i + 1}`)}: {count}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <VirtualGrid data={data?.badges || []} md={3} xs={4}>
        {(_, badge) => <BadgeTile {...badge} />}
      </VirtualGrid>
    </Box>
  ) : null
}

function BadgeTile({ badge, ...gym }: import('@rm/types').Gym) {
  const { t } = useTranslation()
  const map = useMap()
  const badgeIcon = useMemory((s) => s.Icons.getMisc(`badge_${badge - 1}`))

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
        disabled={gym.deleted}
        onClick={() => map.flyTo([gym.lat, gym.lon], 16)}
      >
        <Img
          alt={gym.url}
          className="badge-diamond"
          height={120}
          src={gym.url ? gym.url.replace('http://', 'https://') : ''}
          width={120}
        />
        {gym.deleted && <div className="disabled-overlay badge-diamond" />}
        {badge && badge > 1 && (
          <Img
            alt={t(`badge_${badge}`)}
            src={badgeIcon}
            width={96}
            zIndex={10}
          />
        )}
      </Button>
      <ToggleTypography
        className="vgrid-caption"
        color={gym.deleted ? 'GrayText' : 'inherit'}
        variant="caption"
      >
        {gym.name || t('unknown_gym')}
      </ToggleTypography>
    </Box>
  ) : null
}
