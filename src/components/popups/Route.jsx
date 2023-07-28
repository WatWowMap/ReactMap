// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Popup } from 'react-leaflet'
import { useQuery } from '@apollo/client'
import { Avatar, Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

import Query from '@services/Query'

import Title from './common/Title'
import TimeSince from './common/Timer'

/**
 *
 * @param {import('../../../server/src/types').Route} props
 * @returns
 */
export default function RoutePopup(props) {
  const [route, setRoute] = React.useState({ ...props, tags: [] })

  const { data } = useQuery(Query.routes('getOne'), {
    variables: { id: props.id },
  })
  const { t } = useTranslation()

  React.useEffect(() => {
    if (data?.route) {
      setRoute({ ...route, ...data.route })
    }
  }, [data])

  return (
    <Popup>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          '> *': {
            padding: 0,
          },
        }}
      >
        <Title sx={{ pb: 2 }}>{route.name}</Title>
        <Avatar
          alt={route.name}
          src={route.image}
          style={{
            width: 120,
            height: 120,
            border: `4px solid #${route.image_border_color}`,
          }}
        />
        <Typography variant="subtitle2">{route.description}</Typography>
        <Typography variant="subtitle2">
          {t('distance', 'Distance')}: {route.distance_meters}m
        </Typography>
        <Typography variant="subtitle2">
          {t('poi', 'Points of Interest')}: {route.waypoints.length}
        </Typography>
        <Typography variant="subtitle2">
          {t('reversible', 'reversible')}:{' '}
          {route.reversible ? (
            <CheckIcon color="success" />
          ) : (
            <CloseIcon color="error" />
          )}
        </Typography>
        <Typography variant="subtitle2">
          {t('version', 'Version')}: {route.version}
        </Typography>
        <Typography variant="subtitle2">{t('route_tags')}</Typography>
        {route.tags.map((tag) => (
          <Typography key={tag} variant="caption">
            {t(tag)}
          </Typography>
        ))}
        <Typography variant="subtitle2">
          {t(`route_type_${route.type}`)}
        </Typography>
        <Typography variant="subtitle2">{t('last_updated')}</Typography>
        <TimeSince expireTime={route.updated} />
      </Box>
    </Popup>
  )
}
