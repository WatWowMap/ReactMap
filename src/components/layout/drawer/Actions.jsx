import React, { forwardRef } from 'react'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AccountBoxIcon from '@mui/icons-material/AccountBox'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import FeedbackIcon from '@mui/icons-material/Feedback'
import HeartIcon from '@mui/icons-material/Favorite'

import { useStore, useStatic, useLayoutStore } from '@hooks/useStore'
import FAIcon from '../general/FAIcon'

const importSettings = (e) => {
  const file = e.target.files[0]
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = function parse(newSettings) {
    const contents = newSettings.target.result
    localStorage.clear()
    localStorage.setItem('local-state', contents)
  }
  reader.readAsText(file)
  setTimeout(() => window.location.reload(), 1500)
}

const exportSettings = () => {
  const json = localStorage.getItem('local-state')
  const el = document.createElement('a')
  el.setAttribute(
    'href',
    `data:application/json;chartset=utf-8,${encodeURIComponent(json)}`,
  )
  el.setAttribute('download', 'settings.json')
  el.style.display = 'none'
  document.body.appendChild(el)
  el.click()
  document.body.removeChild(el)
}

const renderLink = forwardRef(({ to, ...itemProps }, ref) => (
  <Link to={to} ref={ref} {...itemProps} />
))

export default function DrawerActions() {
  const { t } = useTranslation()
  const {
    auth: { loggedIn, methods },
    config,
  } = useStatic.getState()

  return (
    <List>
      {config.map.enableUserProfile && (
        <ListItemButton
          onClick={() => useLayoutStore.setState({ userProfile: true })}
        >
          <ListItemIcon>
            <AccountBoxIcon color="secondary" />
          </ListItemIcon>
          <ListItemText primary={t('profile')} />
        </ListItemButton>
      )}
      {config.map.enableTutorial && (
        <ListItemButton onClick={() => useStore.setState({ tutorial: true })}>
          <ListItemIcon>
            <HelpOutlineIcon color="secondary" />
          </ListItemIcon>
          <ListItemText primary={t('tutorial')} />
        </ListItemButton>
      )}
      <input
        accept="application/json"
        id="contained-button-file"
        type="file"
        style={{ display: 'none' }}
        onChange={importSettings}
      />
      <ListItemButton onClick={exportSettings}>
        <ListItemIcon>
          <ImportExportIcon color="secondary" />
        </ListItemIcon>
        <ListItemText primary={t('export')} />
      </ListItemButton>
      <ListItemButton component="label" htmlFor="contained-button-file">
        <ListItemIcon>
          <ImportExportIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('import')} />
      </ListItemButton>
      <ListItemButton
        onClick={() => useLayoutStore.setState({ resetFilters: true })}
      >
        <ListItemIcon>
          <RotateLeftIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('reset_filters')} />
      </ListItemButton>
      {!!methods.length && (
        <ListItemButton
          component={loggedIn ? MuiLink : renderLink}
          to={loggedIn ? undefined : '/login'}
          href={loggedIn ? '/auth/logout' : undefined}
        >
          <ListItemIcon>
            <ExitToAppIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary={t(loggedIn ? 'logout' : 'login')} />
        </ListItemButton>
      )}
      <Divider />
      <ListItemButton
        href="https://github.com/WatWowMap/ReactMap"
        referrerPolicy="no-referrer"
        target="_blank"
        rel="noreferrer"
      >
        <ListItemIcon>
          <HeartIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('contribute')} />
      </ListItemButton>
      {config.map.statsLink && (
        <ListItemButton
          component="button"
          href={config.map.statsLink}
          target="_blank"
          rel="noreferrer"
        >
          <ListItemIcon>
            <TrendingUpIcon color="success" />
          </ListItemIcon>
          <ListItemText primary={t('stats')} />
        </ListItemButton>
      )}
      {config.map.feedbackLink && (
        <ListItemButton
          component="button"
          onClick={() => useLayoutStore.setState({ feedback: true })}
        >
          <ListItemIcon>
            <FeedbackIcon color="success" />
          </ListItemIcon>
          <ListItemText primary={t('feedback')} />
        </ListItemButton>
      )}
      {config.map.discordLink && (
        <ListItemButton
          component="button"
          href={config.map.discordLink}
          target="_blank"
          rel="noreferrer"
        >
          <ListItemIcon>
            <FAIcon className="fab fa-discord" color="secondary" size="small" />
          </ListItemIcon>
          <ListItemText primary="Discord" />
        </ListItemButton>
      )}
    </List>
  )
}
