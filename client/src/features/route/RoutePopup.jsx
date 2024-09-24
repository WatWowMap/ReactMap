// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Popup } from 'react-leaflet'
import { useLazyQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2'
import Avatar from '@mui/material/Avatar'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import ArrowDropUp from '@mui/icons-material/ArrowDropUp'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/Download'

import { Query } from '@services/queries'
import { formatInterval } from '@utils/formatInterval'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { Title } from '@components/popups/Title'
import { Timer } from '@components/popups/Timer'
import { Navigation } from '@components/popups/Navigation'

import { useFormatDistance } from './useFormatDistance'

const IMAGE_SIZE = 80

/**
 *
 * @param {Exclude<import('@mui/material').ListItemTextProps, 'primary'> & { primary: string }} props
 * @returns
 */
function ListItemWrapper({
  primary,
  primaryTypographyProps,
  children = null,
  ...props
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
        {...props}
      />
      {typeof children === 'object' ? (
        children
      ) : (
        <ListItemText
          primary={children}
          primaryTypographyProps={{
            variant: 'subtitle2',
            fontWeight: 400,
            align: 'right',
          }}
          style={{ margin: 0 }}
        />
      )}
    </ListItem>
  )
}

/**
 * @param {{
 *  disabled?: boolean
 *  children: React.ReactNode
 *  expandKey: string
 *  primary: string
 * }} props
 * @returns
 */
function ExpandableWrapper({ disabled = false, children, expandKey, primary }) {
  const expanded = useStorage((s) => !!s.popups[expandKey])
  return (
    <>
      <ListItemWrapper primary={primary}>
        <IconButton
          disabled={disabled}
          size="small"
          sx={{ p: 0 }}
          className={expanded ? 'expanded' : 'closed'}
          onClick={() =>
            useStorage.setState((prev) => ({
              popups: {
                ...prev.popups,
                [expandKey]: !prev.popups[expandKey],
              },
            }))
          }
        >
          <ExpandMore />
        </IconButton>
      </ListItemWrapper>
      <ListItem disablePadding disableGutters>
        <Collapse
          in={expanded}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            width: '90%',
            mx: 'auto',
          }}
        >
          <Box py={1}>{children}</Box>
        </Collapse>
      </ListItem>
    </>
  )
}

/**
 *
 * @param {import("@rm/types").Route & { end?: boolean }} props
 * @returns
 */
export function RoutePopup({ end, ...props }) {
  const [route, setRoute] = React.useState({ ...props, tags: [] })
  const { config } = useMemory.getState()
  const formatDistance = useFormatDistance()

  const [getRoute, { data, called }] = useLazyQuery(Query.routes('getOne'), {
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

  const elevation = React.useMemo(() => {
    const sum = { down: 0, up: 0 }
    for (let i = 1; i < route.waypoints.length - 2; i += 1) {
      const diff =
        route.waypoints[i + 1].elevation_in_meters -
        route.waypoints[i].elevation_in_meters
      if (diff > 0) {
        sum.up += diff
      } else {
        sum.down += Math.abs(diff)
      }
    }
    return sum
  }, [!!route.waypoints])

  const imagesAreEqual =
    route.image === (end ? route.end_image : route.start_image)

  return (
    <Popup
      ref={(ref) => {
        if (ref && ref.isOpen() && !called) {
          getRoute()
        }
      }}
    >
      <Grid2
        alignItems="center"
        justifyContent="center"
        container
        sx={{ width: 200 }}
      >
        <Grid2 xs={12}>
          <Title>{route.name}</Title>
        </Grid2>
        <Grid2
          xs={imagesAreEqual ? 12 : 6}
          container
          alignItems="center"
          justifyContent="center"
          sx={{ py: 2 }}
        >
          <Avatar
            alt={route.name}
            src={route.image}
            style={{
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              border: `4px solid #${route.image_border_color}`,
            }}
          />
        </Grid2>
        {!imagesAreEqual && (end ? route.end_image : route.start_image) && (
          <Grid2 xs={6} container alignItems="center" justifyContent="center">
            <Avatar
              alt={route.name}
              src={end ? route.end_image : route.start_image}
              style={{
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                border: `4px solid #${route.image_border_color}`,
              }}
            />
          </Grid2>
        )}
        <Grid2 xs={12} component={List}>
          <ListItemWrapper primary="distance">
            {formatDistance(route.distance_meters)}
          </ListItemWrapper>
          <ListItemWrapper primary="duration">
            {`${formatInterval((route.duration_seconds || 0) * 1000).str}`}
          </ListItemWrapper>
          <ListItem disablePadding sx={{ justifyContent: 'space-around' }}>
            <ListItemText
              primary={`${t('elevation')}:`}
              primaryTypographyProps={{ variant: 'subtitle2' }}
            />
            <Box display="flex" alignItems="center">
              <ArrowDropUp fontSize="small" />
              <Typography variant="caption">
                {formatDistance(elevation.up)}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <ArrowDropDown fontSize="small" />
              <Typography variant="caption">
                {formatDistance(elevation.down)}
              </Typography>
            </Box>
          </ListItem>
          <ExpandableWrapper
            primary="route_tags"
            expandKey="tags"
            disabled={!route.tags.length}
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
          </ExpandableWrapper>
          <ExpandableWrapper
            primary="description"
            expandKey="routeDescription"
            disabled={!route.description}
          >
            {route.description}
          </ExpandableWrapper>
          <ExpandableWrapper primary="additional_info" expandKey="extraInfo">
            <List disablePadding>
              <ListItemWrapper primary="reversible">
                {route.reversible ? (
                  <CheckIcon fontSize="small" color="success" />
                ) : (
                  <CloseIcon fontSize="small" color="error" />
                )}
              </ListItemWrapper>
              <ListItemWrapper primary="route_type">
                {t(`route_type_${route.type || 0}`)}
              </ListItemWrapper>
              <ListItemWrapper primary="version">
                {route.version || 0}
              </ListItemWrapper>
              <ListItemWrapper primary={t('last_updated')}>
                <Timer expireTime={route.updated} fontWeight={400} />
              </ListItemWrapper>
            </List>
          </ExpandableWrapper>
        </Grid2>
        <Grid2 xs={12} container justifyContent="center">
          <Navigation
            lat={end ? route.end_lat : route.start_lat}
            lon={end ? route.end_lon : route.start_lon}
            size="small"
          />
          {config.misc.enableRouteDownload && (
            <DownloadRouteGPX route={route} />
          )}
        </Grid2>
      </Grid2>
    </Popup>
  )
}

function DownloadRouteGPX({ route }) {
  const GPXContent = React.useMemo(() => {
    if (!route.waypoints.length) {
      return null
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ReactMap" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>${route.name}</name>
    <desc>${route.description}</desc>
    ${route.waypoints
      .map(
        (waypoint) =>
          `<rtept lat="${waypoint.lat_degrees}" lon="${waypoint.lng_degrees}"><ele>${waypoint.elevation_in_meters}</ele></rtept>`,
      )
      .join('\n    ')}
  </rte>
</gpx>`
  }, [route.name, route.description, route.waypoints])

  if (!GPXContent) {
    return null
  }

  return (
    <IconButton
      href={`data:application/gpx;charset=utf-8,${encodeURIComponent(
        GPXContent,
      )}`}
      download={`${route.name}.gpx`}
      size="small"
      style={{ color: 'inherit' }}
    >
      <DownloadIcon />
    </IconButton>
  )
}
