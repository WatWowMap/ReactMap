import React, { forwardRef } from 'react'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link as MuiLink,
} from '@material-ui/core'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AccountBoxIcon from '@material-ui/icons/AccountBox'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'
import HelpOutlineIcon from '@material-ui/icons/HelpOutline'
import RotateLeftIcon from '@material-ui/icons/RotateLeft'
import ImportExportIcon from '@material-ui/icons/ImportExport'
import TrendingUpIcon from '@material-ui/icons/TrendingUp'
import FeedbackIcon from '@material-ui/icons/Feedback'
import HeartIcon from '@material-ui/icons/Favorite'

import { useStore, useStatic } from '@hooks/useStore'
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
    setUserProfile,
    setFeedback,
    setResetFilters,
    config,
  } = useStatic.getState()
  const { setTutorial } = useStore.getState()

  return (
    <List>
      {config.map.enableUserProfile && (
        <ListItem button onClick={() => setUserProfile(true)}>
          <ListItemIcon>
            <AccountBoxIcon color="secondary" />
          </ListItemIcon>
          <ListItemText primary={t('profile')} />
        </ListItem>
      )}
      {config.map.discordLink && (
        <ListItem
          button
          component="button"
          href={config.map.discordLink}
          target="_blank"
          rel="noreferrer"
        >
          <ListItemIcon>
            <FAIcon className="fab fa-discord" color="secondary" size="small" />
          </ListItemIcon>
          <ListItemText primary="Discord" />
        </ListItem>
      )}
      {config.map.enableTutorial && (
        <ListItem button onClick={() => setTutorial(true)}>
          <ListItemIcon>
            <HelpOutlineIcon color="secondary" />
          </ListItemIcon>
          <ListItemText primary={t('tutorial')} />
        </ListItem>
      )}
      {config.map.statsLink && (
        <ListItem
          button
          component="button"
          href={config.map.statsLink}
          target="_blank"
          rel="noreferrer"
        >
          <ListItemIcon>
            <TrendingUpIcon color="action" />
          </ListItemIcon>
          <ListItemText primary={t('stats')} />
        </ListItem>
      )}
      {config.map.feedbackLink && (
        <ListItem button component="button" onClick={() => setFeedback(true)}>
          <ListItemIcon>
            <FeedbackIcon color="action" />
          </ListItemIcon>
          <ListItemText primary={t('feedback')} />
        </ListItem>
      )}
      <input
        accept="application/json"
        id="contained-button-file"
        type="file"
        style={{ display: 'none' }}
        onChange={importSettings}
      />
      <ListItem button component="label" htmlFor="contained-button-file">
        <ListItemIcon>
          <ImportExportIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('import')} />
      </ListItem>
      <ListItem button onClick={exportSettings}>
        <ListItemIcon>
          <ImportExportIcon color="secondary" />
        </ListItemIcon>
        <ListItemText primary={t('export')} />
      </ListItem>
      <ListItem button onClick={() => setResetFilters(true)}>
        <ListItemIcon>
          <RotateLeftIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary={t('reset_filters')} />
      </ListItem>
      {!!methods.length && (
        <ListItem
          button
          component={loggedIn ? MuiLink : renderLink}
          to={loggedIn ? undefined : '/login'}
          style={{ textDecoration: 'none', color: 'white' }}
          href={loggedIn ? '/auth/logout' : undefined}
        >
          <ListItemIcon>
            <ExitToAppIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary={t(loggedIn ? 'logout' : 'login')} />
        </ListItem>
      )}
      <a
        href="https://github.com/WatWowMap/ReactMap"
        referrerPolicy="no-referrer"
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: 'none', color: 'white' }}
      >
        <ListItem button>
          <ListItemIcon>
            <HeartIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary={t('contribute')} />
        </ListItem>
      </a>
    </List>
  )
}
