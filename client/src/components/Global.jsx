// @ts-check
import * as React from 'react'
import GlobalStyles from '@mui/material/GlobalStyles'
import { darken, lighten } from '@mui/material/styles'

import { useMemory } from '@store/useMemory'

function ApplyGlobal() {
  const online = useMemory((s) => s.online)
  return (
    <GlobalStyles
      styles={(theme) => {
        const darkMode = theme.palette.mode === 'dark'
        const grey = darkMode ? 900 : 50
        return {
          // Global
          body: {
            backgroundColor: theme.palette.background.paper,
          },
          '*': {
            scrollbarWidth: 'thin',
          },
          '*::-webkit-scrollbar': {
            width: '5px',
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.grey[grey],
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.action.selected,
            borderRadius: '3px',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme.palette.action.selected,
          },
          '*::-webkit-scrollbar-thumb:active': {
            backgroundColor: theme.palette.action.selected,
          },

          // Leaflet
          '.leaflet-tooltip': {
            backgroundColor: theme.palette.background.paper,
            border: `${theme.palette.divider} solid 1px`,
            color: theme.palette.text.primary,
          },
          '.leaflet-tooltip-bottom:before': {
            borderBottomColor: theme.palette.background.paper,
          },
          '.leaflet-tooltip-top:before': {
            borderTopColor: theme.palette.background.paper,
          },
          '.leaflet-popup-tip-container .leaflet-popup-tip': {
            backgroundColor: theme.palette.background.paper,
            border: `${theme.palette.divider} solid 7px`,
          },
          '.leaflet-popup-content': {
            margin: '13px 20px',
          },
          '.leaflet-popup-content-wrapper': {
            backgroundColor: theme.palette.background.paper,
            border: `${theme.palette.divider} solid 4px`,
            color: theme.palette.text.primary,
          },
          '.leaflet-bar a': {
            backgroundColor: theme.palette.grey[grey],
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            transition: theme.transitions.create(['background-color'], {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            }),
            fontSize: 17,
          },
          '.leaflet-bar a:active, .leaflet-bar a:focus, .leaflet-bar a:hover': {
            backgroundColor: darken(
              theme.palette.grey[grey],
              darkMode ? 0.2 : 0.1,
            ),
          },
          '.leaflet-control-locate.requesting span': {
            color: theme.palette.text.primary,
            animation: 'leaflet-control-locate-spin 2s linear infinite',
          },
          '.leaflet-control-locate.active a': {
            color: 'rgb(32, 116, 182)',
          },
          '.leaflet-control-locate.active.following a': {
            color: 'rgb(252, 132, 40)',
          },
          '.leaflet-control-locate a .leaflet-control-locate-spinner': {
            backgroundImage: `url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="${encodeURIComponent(
              theme.palette.text.primary,
            )}" d="M304 48a48 48 0 1 1-96 0 48 48 0 0 1 96 0zm-48 368a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm208-208a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM96 256a48 48 0 1 0-96 0 48 48 0 0 0 96 0zm13 99a48 48 0 1 0 0 96 48 48 0 0 0 0-96zm294 0a48 48 0 1 0 0 96 48 48 0 0 0 0-96zM109 61a48 48 0 1 0 0 96 48 48 0 0 0 0-96z"/></svg>')`,
          },
          '.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out':
            {
              lineHeight: '25px !important',
            },
          '.leaflet-bar a.leaflet-disabled': {
            backgroundColor: lighten(theme.palette.grey[grey], 0.2),
          },
          '.leaflet-container .leaflet-control-attribution': {
            background: online ? 'rgba(255, 255, 255, 0.8)' : 'red',
            color: online ? '#333' : 'white',
          },

          // Other
          '.ar-task': {
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: '12px',
            padding: '3px',
            fontSize: '0.5rem !important',
            backgroundColor: theme.palette.grey[grey],
            color: theme.palette.text.primary,
          },
          '.iv-badge': {
            color: theme.palette.text.primary,
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            font: 'bold 12px/8px Roboto, sans-serif',
            padding: 4,
            boxSizing: 'content-box',
            flexWrap: 'nowrap',
          },
          '.raid-badge': {
            border: `2px solid ${theme.palette.divider}`,
            position: 'absolute',
            borderRadius: 12,
            height: 14,
          },
          '.disabled-overlay': {
            backgroundColor: theme.palette.grey[grey],
          },
        }
      }}
    />
  )
}

export const globalStyles = <ApplyGlobal />
