import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
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
import { useMapStore } from '@store/useMapStore'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { I } from '@components/I'
import { BasicListButton } from '@components/inputs/BasicListButton'

const importSettings: React.ChangeEventHandler<HTMLInputElement> = (e) => {
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

const LogoutButton = (
  <BasicListButton component="a" href="/auth/logout" label="logout">
    <ExitToAppIcon color="error" />
  </BasicListButton>
)

const LoginButton = (
  <BasicListButton component={Link} label="login" to="/login">
    <ExitToAppIcon color="error" />
  </BasicListButton>
)

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

export function DrawerActions() {
  const {
    auth: { loggedIn, methods },
    config,
  } = useMemory.getState()

  return (
    <List>
      {config.misc.enableUserProfile && (
        <BasicListButton
          label="profile"
          onClick={() => useLayoutStore.setState({ userProfile: true })}
        >
          <AccountBoxIcon color="secondary" />
        </BasicListButton>
      )}
      {config.misc.enableTutorial && (
        <BasicListButton
          label="tutorial"
          onClick={() => useStorage.setState({ tutorial: true })}
        >
          <HelpOutlineIcon color="secondary" />
        </BasicListButton>
      )}
      <BasicListButton label="export" onClick={exportSettings}>
        <ImportExportIcon color="secondary" />
      </BasicListButton>

      <BasicListButton component="label" label="import">
        <ImportExportIcon color="error" />
        <VisuallyHiddenInput
          accept="application/json"
          type="file"
          onChange={importSettings}
        />
      </BasicListButton>

      <BasicListButton
        label="reset_filters"
        onClick={() => useLayoutStore.setState({ resetFilters: true })}
      >
        <ReplayIcon color="error" />
      </BasicListButton>

      {!!methods.length && (loggedIn ? LogoutButton : LoginButton)}
      <Divider />
      {!(
        // @ts-ignore
        config.misc.rude
      ) && (
        <BasicListButton
          component="a"
          href="https://github.com/WatWowMap/ReactMap"
          label="contribute"
          referrerPolicy="no-referrer"
          rel="noreferrer"
          target="_blank"
        >
          <HeartIcon color="error" />
        </BasicListButton>
      )}
      {config.links.statsLink && (
        <BasicListButton
          component="a"
          href={config.links.statsLink}
          label="stats"
          rel="noreferrer"
          target="_blank"
        >
          <TrendingUpIcon color="success" />
        </BasicListButton>
      )}
      {config.links.feedbackLink && (
        <BasicListButton
          label="feedback"
          onClick={() => useLayoutStore.setState({ feedback: true })}
        >
          <FeedbackIcon color="success" />
        </BasicListButton>
      )}
      {config.links.discordLink && (
        <BasicListButton
          component="a"
          href={config.links.discordLink}
          label="Discord"
          rel="noreferrer"
          target="_blank"
        >
          <I className="fab fa-discord" color="secondary" size="small" />
        </BasicListButton>
      )}
    </List>
  )
}
