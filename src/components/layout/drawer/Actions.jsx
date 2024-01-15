import * as React from 'react'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'

import { Link } from 'react-router-dom'
import AccountBoxIcon from '@mui/icons-material/AccountBox'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import FeedbackIcon from '@mui/icons-material/Feedback'
import HeartIcon from '@mui/icons-material/Favorite'
import { downloadJson } from '@services/functions/downloadJson'

import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import { I } from '../general/I'
import { BasicListButton } from '../general/BasicListButton'

/** @type {React.ChangeEventHandler<HTMLInputElement>} */
const importSettings = (e) => {
  const file = e.target.files[0]
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = function parse(newSettings) {
    const contents = newSettings.target.result
    localStorage.clear()
    localStorage.setItem('local-state', contents.toString())
  }
  reader.readAsText(file)
  setTimeout(() => window.location.reload(), 1500)
}

const exportSettings = () => {
  const json = localStorage.getItem('local-state')
  downloadJson(json, 'settings.json')
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

const renderLink = React.forwardRef(({ to, ...itemProps }, ref) => (
  <Link to={to} ref={ref} {...itemProps} />
))

export default function DrawerActions() {
  const {
    auth: { loggedIn, methods },
    config,
  } = useMemory.getState()

  return (
    <List>
      {config.misc.enableUserProfile && (
        <BasicListButton
          onClick={() => useLayoutStore.setState({ userProfile: true })}
          label="profile"
        >
          <AccountBoxIcon color="secondary" />
        </BasicListButton>
      )}
      {config.misc.enableTutorial && (
        <BasicListButton
          onClick={() => useStorage.setState({ tutorial: true })}
          label="tutorial"
        >
          <HelpOutlineIcon color="secondary" />
        </BasicListButton>
      )}
      <input
        accept="application/json"
        id="contained-button-file"
        type="file"
        style={{ display: 'none' }}
        onChange={importSettings}
      />
      <BasicListButton onClick={exportSettings} label="export">
        <ImportExportIcon color="secondary" />
      </BasicListButton>

      <BasicListButton
        component="label"
        htmlFor="contained-button-file"
        onClick={exportSettings}
        label="import"
      >
        <ImportExportIcon color="primary" />
      </BasicListButton>

      <BasicListButton
        onClick={() => useLayoutStore.setState({ resetFilters: true })}
        label="reset_filters"
      >
        <RotateLeftIcon color="primary" />
      </BasicListButton>

      {!!methods.length && (
        <BasicListButton
          component={loggedIn ? MuiLink : renderLink}
          to={loggedIn ? undefined : '/login'}
          href={loggedIn ? '/auth/logout' : undefined}
          label={loggedIn ? 'logout' : 'login'}
        >
          <ExitToAppIcon color="primary" />
        </BasicListButton>
      )}
      <Divider />
      {!config.misc.rude && (
        <BasicListButton
          href="https://github.com/WatWowMap/ReactMap"
          referrerPolicy="no-referrer"
          target="_blank"
          rel="noreferrer"
          label="contribute"
        >
          <HeartIcon color="primary" />
        </BasicListButton>
      )}
      {config.links.statsLink && (
        <BasicListButton
          component="button"
          href={config.links.statsLink}
          target="_blank"
          rel="noreferrer"
          label="stats"
        >
          <TrendingUpIcon color="success" />
        </BasicListButton>
      )}
      {config.links.feedbackLink && (
        <BasicListButton
          onClick={() => useLayoutStore.setState({ feedback: true })}
          label="feedback"
        >
          <FeedbackIcon color="success" />
        </BasicListButton>
      )}
      {config.links.discordLink && (
        <BasicListButton
          href={config.links.discordLink}
          target="_blank"
          rel="noreferrer"
          label="Discord"
        >
          <I className="fab fa-discord" color="secondary" size="small" />
        </BasicListButton>
      )}
    </List>
  )
}
