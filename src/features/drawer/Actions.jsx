import * as React from 'react'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'

import { Link } from 'react-router-dom'
import AccountBoxIcon from '@mui/icons-material/AccountBox'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ReplayIcon from '@mui/icons-material/Replay'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import FeedbackIcon from '@mui/icons-material/Feedback'
import HeartIcon from '@mui/icons-material/Favorite'
import { downloadJson } from '@utils/downloadJson'
import { deepMerge } from '@utils/deepMerge'
import { useMapStore } from '@hooks/useMapStore'

import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { useStorage } from '@hooks/useStorage'
import { I } from '@components/I'
import { BasicListButton } from '@components/inputs/BasicListButton'

/** @type {React.ChangeEventHandler<HTMLInputElement>} */
const importSettings = (e) => {
  const file = e.target.files[0]
  if (!file) {
    return
  }
  const reader = new FileReader()
  reader.onload = function parse(newSettings) {
    try {
      const { state: newState } = JSON.parse(
        newSettings.target.result.toString(),
      )
      const { map } = useMapStore.getState()
      useStorage.setState((oldState) => deepMerge({}, oldState, newState))
      const { location, zoom } = useStorage.getState()
      map.setView(location, zoom)
    } catch (error) {
      if (error instanceof Error)
        useMemory.setState({ clientError: error.message })
    }
  }
  reader.readAsText(file)
}

const exportSettings = () =>
  downloadJson(localStorage.getItem('local-state'), 'settings.json')

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
      <BasicListButton onClick={exportSettings} label="export">
        <ImportExportIcon color="secondary" />
      </BasicListButton>

      <input
        accept="application/json"
        id="import-settings-btn"
        type="file"
        style={{ display: 'none' }}
        onChange={importSettings}
      />
      <BasicListButton
        component="label"
        htmlFor="import-settings-btn"
        label="import"
      >
        <ImportExportIcon color="error" />
      </BasicListButton>

      <BasicListButton
        onClick={() => useLayoutStore.setState({ resetFilters: true })}
        label="reset_filters"
      >
        <ReplayIcon color="error" />
      </BasicListButton>

      {!!methods.length && (
        <BasicListButton
          component={loggedIn ? MuiLink : renderLink}
          to={loggedIn ? undefined : '/login'}
          href={loggedIn ? '/auth/logout' : undefined}
          label={loggedIn ? 'logout' : 'login'}
        >
          <ExitToAppIcon color="error" />
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
          <HeartIcon color="error" />
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
