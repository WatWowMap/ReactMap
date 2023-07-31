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

import Query from '@services/Query'
import formatInterval from '@services/functions/formatInterval'
import { useStore } from '@hooks/useStore'

import Title from './common/Title'
import TimeSince from './common/Timer'
import Navigation from './common/Navigation'

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
  // @ts-ignore
  const expanded = useStore((s) => !!s.popups[expandKey])
  return (
    <>
      <ListItemWrapper primary={primary}>
        <IconButton
          disabled={disabled}
          size="small"
          sx={{ p: 0 }}
          className={expanded ? 'expanded' : 'closed'}
          onClick={() =>
            useStore.setState((prev) => ({
              popups: {
                // @ts-ignore
                ...prev.popups,
                // @ts-ignore
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
 * @param {import('../../../server/src/types').Route & { end?: boolean }} props
 * @returns
 */
export default function RoutePopup({ end, ...props }) {
  const [route, setRoute] = React.useState({ ...props, tags: [] })
  // @ts-ignore
  const locale = useStore((s) => s.settings.localeSelection)

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
    for (let i = 0; i < route.waypoints.length - 1; i += 1) {
      const diff =
        route.waypoints[i + 1].elevation_in_meters -
        route.waypoints[i].elevation_in_meters
      if (diff > 0) {
        sum.up += diff
      } else {
        sum.down += Math.abs(diff)
      }
    }
    sum.down = Math.round(sum.down)
    sum.up = Math.round(sum.up)
    return sum
  }, [!!route.waypoints])

  const numFormatter = new Intl.NumberFormat(locale, {
    unitDisplay: 'short',
    unit: 'meter',
    style: 'unit',
  })

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
            {`${numFormatter.format(route.distance_meters || 0)}`}
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
                {numFormatter.format(elevation.up)}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <ArrowDropDown fontSize="small" />
              <Typography variant="caption">
                {numFormatter.format(elevation.down)}
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
                <TimeSince expireTime={route.updated} fontWeight={400} />
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
        </Grid2>
      </Grid2>
    </Popup>
  )
}
