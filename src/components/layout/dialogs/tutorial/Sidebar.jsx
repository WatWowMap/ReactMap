import * as React from 'react'
import Menu from '@mui/icons-material/Menu'
import Settings from '@mui/icons-material/Settings'
import TuneIcon from '@mui/icons-material/Tune'

import {
  Grid,
  DialogContent,
  Typography,
  Fab,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItem,
  Switch,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useMemory, toggleDialog } from '@hooks/useMemory'
import Utility from '@services/Utility'

import data from './data'

export default function TutSidebar() {
  const { t } = useTranslation()
  const { perms } = useMemory((state) => state.auth)
  const isMobile = useMemory((state) => state.isMobile)

  const [tempFilters, setTempFilters] = React.useState(
    Object.fromEntries(
      Object.keys(data.filters).map((x) => [x, !!Math.round(Math.random())]),
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
        style={{ height: '100%' }}
      >
        <Grid item xs={8} style={{ textAlign: 'center' }}>
          <Typography variant={isMobile ? 'subtitle2' : 'h6'} align="center">
            {t('tutorial_sidebar_0')}
          </Typography>
        </Grid>
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <Fab color="primary">
            <Menu />
          </Fab>
        </Grid>
        <Grid item xs={12}>
          <Divider light />
        </Grid>
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorial_sidebar_1')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <List disablePadding>
            {Object.keys(data.filters).map((subItem) => {
              if (subItem === 'filter') {
                return null
              }
              return (
                <ListItem key={subItem}>
                  <ListItemText primary={t(Utility.camelToSnake(subItem))} />
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
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t('tutorial_sidebar_2')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
