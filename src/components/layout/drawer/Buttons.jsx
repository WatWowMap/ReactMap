import React from 'react'
import { Grid, Button } from '@material-ui/core'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'

const style = { textAlign: 'center', padding: 10 }

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

export default function DrawerButtons() {
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
    <Grid
      justifyContent="space-evenly"
      alignItems="center"
      direction="row"
      container
      style={{
        width: 300,
        height: '90%',
        padding: '20px 0',
      }}
    >
      {config.map.enableUserProfile && (
        <Grid item xs={t('drawer_settings_profile_width')} style={style}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => setUserProfile(true)}
          >
            {t('profile')}
          </Button>
        </Grid>
      )}
      {Boolean(methods.length) && (
        <Grid item xs={t('drawer_settings_logout_width')} style={style}>
          {loggedIn ? (
            <Button
              className="sidebar-button"
              variant="contained"
              style={{ minWidth: 100 }}
              color="primary"
              size="small"
              href="/auth/logout"
            >
              {t('logout')}
            </Button>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button
                className="sidebar-button"
                variant="contained"
                style={{ minWidth: 100 }}
                color="primary"
                size="small"
              >
                {t('login')}
              </Button>
            </Link>
          )}
        </Grid>
      )}
      {config.map.enableTutorial && (
        <Grid item xs={t('drawer_settings_tutorial_width')} style={style}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => setTutorial(true)}
          >
            {t('tutorial')}
          </Button>
        </Grid>
      )}
      <Grid item xs={t('drawer_settings_reset_filters_width')} style={style}>
        <Button
          style={{ minWidth: 100 }}
          variant="contained"
          color="primary"
          size="small"
          onClick={() => setResetFilters(true)}
        >
          {t('reset_filters')}
        </Button>
      </Grid>
      <Grid item xs={t('drawer_settings_export_settings_width')} style={style}>
        <Button
          style={{ minWidth: 100 }}
          variant="contained"
          color="secondary"
          size="small"
          onClick={exportSettings}
        >
          {t('export')}
        </Button>
      </Grid>
      <Grid item xs={t('drawer_settings_import_settings_width')} style={style}>
        <input
          accept="application/json"
          id="contained-button-file"
          type="file"
          style={{ display: 'none' }}
          onChange={importSettings}
        />
        <label htmlFor="contained-button-file">
          <Button
            component="span"
            style={{ minWidth: 100 }}
            variant="contained"
            color="primary"
            size="small"
          >
            {t('import')}
          </Button>
        </label>
      </Grid>
      {config.map.statsLink && (
        <Grid item xs={t('drawer_settings_stats_width')} style={style}>
          <Button
            variant="contained"
            color="secondary"
            style={{ minWidth: 100 }}
            href={config.map.statsLink}
            target="_blank"
            rel="noreferrer"
            size="small"
          >
            {t('stats')}
          </Button>
        </Grid>
      )}
      {config.map.feedbackLink && (
        <Grid item xs={t('drawer_settings_feedback_width')} style={style}>
          <Button
            variant="contained"
            color="primary"
            style={{ minWidth: 100 }}
            onClick={() => setFeedback(true)}
            size="small"
          >
            {t('feedback')}
          </Button>
        </Grid>
      )}
    </Grid>
  )
}
