// @ts-check
import * as React from 'react'
import { Popup } from 'react-leaflet'
import { useLazyQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import DirectionsIcon from '@mui/icons-material/Directions'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'

import { Query } from '@services/queries'
import { formatInterval } from '@utils/formatInterval'
import { useFormatDistance } from './useFormatDistance'

/**
 * Popup component for POI with routes
 * @param {{
 *   routes: import("@rm/types").Route[]
 *   poiType: 'start' | 'end'
 *   selectedRoute: import("@rm/types").Route | null
 *   onRouteSelect: (route: import("@rm/types").Route) => void
 *   onRouteDeselect: () => void
 *   showRoutes: boolean
 * }} props
 */
export function RoutePoiPopup({
  routes,
  poiType,
  selectedRoute,
  onRouteSelect,
  onRouteDeselect,
  showRoutes,
}) {
  const { t } = useTranslation()
  const formatDistance = useFormatDistance()
  const [enrichedRoutes, setEnrichedRoutes] = React.useState(routes)

  const [getRoute] = useLazyQuery(Query.routes('getOne'))

  // Fetch detailed route data when popup opens
  React.useEffect(() => {
    if (showRoutes && routes.length > 0) {
      // Fetch detailed data for all routes
      const fetchRouteDetails = async () => {
        const detailedRoutes = await Promise.all(
          routes.map(async (route) => {
            try {
              const { data } = await getRoute({ variables: { id: route.id } })
              if (data?.route) {
                return {
                  ...route,
                  ...data.route,
                  tags: data.route.tags || [],
                }
              }
              return route
            } catch (error) {
              // Silently handle failed route fetches and use basic route data
              return route
            }
          }),
        )
        setEnrichedRoutes(detailedRoutes)
      }

      fetchRouteDetails()
    }
  }, [showRoutes, routes, getRoute])

  if (!showRoutes) return null

  const handleRouteClick = (route) => {
    if (selectedRoute?.id === route.id) {
      onRouteDeselect()
    } else {
      onRouteSelect(route)
    }
  }

  const getRouteSubtitle = (route) => {
    const distance = formatDistance(route.distance_meters || 0)
    const duration = formatInterval((route.duration_seconds || 0) * 1000).str
    const type = t(`route_type_${route.type || 0}`)
    return `${distance} • ${duration} • ${type}`
  }

  const getRouteIcon = (route) =>
    poiType === 'start'
      ? route.start_image || route.image
      : route.end_image || route.image

  return (
    <Popup maxWidth={350} minWidth={300} closeOnEscapeKey closeButton={false}>
      <Grid2 container sx={{ width: '100%', maxWidth: 350 }}>
        {/* Header */}
        <Grid2
          xs={12}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography variant="h6" component="h2">
            {t(
              `routes_from_poi_${enrichedRoutes.length === 1 ? 'one' : 'other'}`,
              {
                count: enrichedRoutes.length,
                type:
                  poiType === 'both'
                    ? t('available')
                    : poiType === 'start'
                      ? t('starting')
                      : t('ending'),
              },
            )}
          </Typography>
          <IconButton size="small" onClick={onRouteDeselect}>
            <CloseIcon />
          </IconButton>
        </Grid2>

        {/* Routes List */}
        <Grid2 xs={12}>
          <List disablePadding>
            {enrichedRoutes.map((route, index) => (
              <React.Fragment key={route.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedRoute?.id === route.id}
                    onClick={() => handleRouteClick(route)}
                    sx={{
                      borderRadius: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                        },
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={getRouteIcon(route)}
                        alt={route.name || `Route ${route.id}`}
                        sx={{
                          width: 40,
                          height: 40,
                          border: `2px solid #${route.image_border_color}`,
                        }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                            {route.name || `Route ${route.id}`}
                          </span>
                          {route.reversible && (
                            <SwapHorizIcon fontSize="small" color="primary" />
                          )}
                        </span>
                      }
                      secondary={getRouteSubtitle(route)}
                    />
                    {/* Move route tags outside ListItemText to avoid nesting issues */}
                    {route.tags && route.tags.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          marginTop: '4px',
                          marginLeft: '56px', // Align with text content
                        }}
                      >
                        {route.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={t(tag)}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                        {route.tags.length > 3 && (
                          <Chip
                            label={`+${route.tags.length - 3}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </div>
                    )}
                    <DirectionsIcon
                      color={
                        selectedRoute?.id === route.id ? 'inherit' : 'action'
                      }
                      fontSize="small"
                    />
                  </ListItemButton>
                </ListItem>
                {index < enrichedRoutes.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        </Grid2>

        {/* Selected Route Details */}
        {selectedRoute && (
          <Grid2
            xs={12}
            sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
          >
            <Typography
              variant="body2"
              color="primary"
              fontWeight="medium"
              gutterBottom
            >
              {t('route_displayed')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('route_click_map_to_hide')}
            </Typography>
            {selectedRoute.description && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                {selectedRoute.description}
              </Typography>
            )}
          </Grid2>
        )}
      </Grid2>
    </Popup>
  )
}
