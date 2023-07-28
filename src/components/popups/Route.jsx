// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Popup } from 'react-leaflet'
import { useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

import Query from '@services/Query'
import { useStore } from '@hooks/useStore'

import Title from './common/Title'
import TimeSince from './common/Timer'

/**
 *
 * @param {{
 *  primary: string
 *  primaryTypographyProps?: import('@mui/material/Typography').TypographyProps
 *  sx?: import('@mui/material').SxProps
 *  children?: React.ReactNode
 * }} props
 * @returns
 */
function ListItemWrapper({
  primary,
  primaryTypographyProps,
  sx,
  children = null,
}) {
  const { t } = useTranslation()

  return (
    <ListItem disablePadding>
      <ListItemText
        primary={`${t(primary)}:`}
        primaryTypographyProps={{
          variant: 'subtitle2',
          ...primaryTypographyProps,
        }}
        style={{ margin: 0 }}
        sx={sx}
      />
      {typeof children === 'object' ? (
        children
      ) : (
        <ListItemText
          primary={children}
          primaryTypographyProps={{ variant: 'subtitle2', align: 'right' }}
        />
      )}
    </ListItem>
  )
}

/**
 *
 * @param {import('../../../server/src/types').Route} props
 * @returns
 */
export default function RoutePopup(props) {
  const [route, setRoute] = React.useState({ ...props, tags: [] })
  // @ts-ignore
  const expanded = useStore((s) => !!s.popups.tags)

  const { data } = useQuery(Query.routes('getOne'), {
    variables: { id: props.id },
  })
  const { t } = useTranslation()

  React.useEffect(() => {
    if (data?.route) {
      setRoute({
        ...route,
        ...data.route,
        waypoints: route.waypoints || [],
        tags: data.route.tags || [],
      })
    }
  }, [data])

  return (
    <Popup>
      <Grid2
        alignItems="center"
        justifyContent="center"
        container
        sx={{ width: 250 }}
      >
        <Grid2 xs={12}>
          <Title sx={{ pb: 2 }}>{route.name}</Title>
        </Grid2>
        <Grid2 xs={12} container alignItems="center" justifyContent="center">
          <Avatar
            alt={route.name}
            src={route.image}
            style={{
              width: 120,
              height: 120,
              border: `4px solid #${route.image_border_color}`,
            }}
          />
        </Grid2>
        <Grid2 xs={12}>
          <Typography variant="subtitle2" pt={2} pb={1}>
            {route.description?.length > 75
              ? `${route.description.slice(0, 75).trim()}...`
              : route.description}
          </Typography>
        </Grid2>

        <Grid2 container xs={12} component={List}>
          <ListItemWrapper primary="distance">
            {`${route.distance_meters || 0}m`}
          </ListItemWrapper>
          <ListItemWrapper primary="points">
            {route.waypoints.length}
          </ListItemWrapper>
          <ListItemWrapper primary="reversible">
            {route.reversible ? (
              <CheckIcon color="success" />
            ) : (
              <CloseIcon color="error" />
            )}
          </ListItemWrapper>
          <ListItemWrapper primary="route_type">
            {t(`route_type_${route.type}`)}
          </ListItemWrapper>
          <ListItemWrapper primary="version">{route.version}</ListItemWrapper>
        </Grid2>
        <Grid2 container xs={12} alignItems="center">
          <Grid2 flexGrow={1}>
            <Typography variant="h6" align="center" width="100%" py={0}>
              {t('route_tags')}
            </Typography>
          </Grid2>
          <Grid2>
            <IconButton
              className={expanded ? 'expanded' : 'closed'}
              onClick={() =>
                useStore.setState((prev) => ({
                  // @ts-ignore
                  popups: { ...prev.popups, tags: !prev.popups.tags },
                }))
              }
            >
              <ExpandMore />
            </IconButton>
          </Grid2>
        </Grid2>
        <Collapse
          in={expanded}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {route.tags.map((tag) => (
            <Chip
              key={tag}
              label={t(tag)}
              size="small"
              color="secondary"
              sx={{ m: 0.25 }}
            />
          ))}
        </Collapse>

        <Grid2 container xs={12} justifyContent="center" alignItems="center">
          <Divider flexItem sx={{ width: '100%', height: 1, mt: 1, mb: 2 }} />
          <Grid2 xs={6}>
            <Typography variant="subtitle2">{t('last_updated')}:</Typography>
          </Grid2>
          <Grid2 xs={6} textAlign="right">
            <TimeSince expireTime={route.updated} />
          </Grid2>
        </Grid2>
      </Grid2>
    </Popup>
  )
}
