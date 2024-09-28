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
        alignItems="center"
        direction="row"
        height="100%"
        justifyContent="center"
        spacing={2}
      >
        <Grid textAlign="center" xs={8}>
          <Typography align="center" variant={isMobile ? 'subtitle2' : 'h6'}>
            {t('tutorial_sidebar_0')}
          </Typography>
        </Grid>
        <Grid textAlign="center" xs={4}>
          <Fab color="primary">
            <Menu />
          </Fab>
        </Grid>
        <Grid xs={12}>
          <Divider light />
        </Grid>
        <Grid whiteSpace="pre-line" xs={12}>
          <Typography gutterBottom align="center" variant="subtitle1">
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
              disabled={!permCheck}
              onClick={toggleDialog(true, 'pokestops', 'options')}
            >
              <ListItemIcon>
                <Settings color="secondary" />
              </ListItemIcon>
              <ListItemText primary={t('options')} />
            </ListItemButton>
            <ListItemButton
              disabled={!permCheck}
              onClick={toggleDialog(true, 'pokestops', 'filters')}
            >
              <ListItemIcon>
                <TuneIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t('advanced')} />
            </ListItemButton>
          </List>
        </Grid>
        <Grid whiteSpace="pre-line" xs={12}>
          <Typography gutterBottom align="center" variant="subtitle1">
            {t('tutorial_sidebar_2')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
