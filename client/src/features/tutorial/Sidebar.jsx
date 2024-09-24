// @ts-check

import * as React from 'react'
import Menu from '@mui/icons-material/Menu'
import Settings from '@mui/icons-material/Settings'
import TuneIcon from '@mui/icons-material/Tune'
import Grid from '@mui/material/Unstable_Grid2'
import Fab from '@mui/material/Fab'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListItemButton from '@mui/material/ListItemButton'
import Switch from '@mui/material/Switch'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { toggleDialog } from '@store/useLayoutStore'
import { camelToSnake } from '@utils/strings'

import { tutorialData } from './data'

export function TutorialSidebar() {
  const { t } = useTranslation()
  const { perms } = useMemory((s) => s.auth)
  const isMobile = useMemory((s) => s.isMobile)

  const [tempFilters, setTempFilters] = React.useState(
    Object.fromEntries(
      Object.keys(tutorialData.filters).map((x) => [
        x,
        !!Math.round(Math.random()),
      ]),
    ),
  )

  const permCheck =
    perms.pokestops || perms.invasions || perms.quests || perms.lures

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        height="100%"
      >
        <Grid xs={8} textAlign="center">
          <Typography variant={isMobile ? 'subtitle2' : 'h6'} align="center">
            {t('tutorial_sidebar_0')}
          </Typography>
        </Grid>
        <Grid xs={4} textAlign="center">
          <Fab color="primary">
            <Menu />
          </Fab>
        </Grid>
        <Grid xs={12}>
          <Divider light />
        </Grid>
        <Grid xs={12} whiteSpace="pre-line">
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorial_sidebar_1')}
          </Typography>
        </Grid>
        <Grid xs={12}>
          <List disablePadding>
            {Object.keys(tutorialData.filters).map((subItem) => {
              if (subItem === 'filter') {
                return null
              }
              return (
                <ListItem key={subItem}>
                  <ListItemText primary={t(camelToSnake(subItem))} />
                  <Switch
                    checked={tempFilters[subItem]}
                    onChange={() => {
                      setTempFilters((prev) => ({
                        ...prev,
                        [subItem]: !prev[subItem],
                      }))
                    }}
                  />
                </ListItem>
              )
            })}
            <ListItemButton
              onClick={toggleDialog(true, 'pokestops', 'options')}
              disabled={!permCheck}
            >
              <ListItemIcon>
                <Settings color="secondary" />
              </ListItemIcon>
              <ListItemText primary={t('options')} />
            </ListItemButton>
            <ListItemButton
              onClick={toggleDialog(true, 'pokestops', 'filters')}
              disabled={!permCheck}
            >
              <ListItemIcon>
                <TuneIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t('advanced')} />
            </ListItemButton>
          </List>
        </Grid>
        <Grid xs={12} whiteSpace="pre-line">
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorial_sidebar_2')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
