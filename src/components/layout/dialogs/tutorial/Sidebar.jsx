import React, { useState } from 'react'
import Menu from '@material-ui/icons/Menu'
import Settings from '@material-ui/icons/Settings'
import {
  Grid,
  DialogContent,
  Typography,
  Fab,
  Divider,
  Button,
} from '@material-ui/core'

import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import ItemToggle from '@components/layout/drawer/ItemToggle'
import data from './data.json'

export default function TutSidebar({ toggleDialog, isMobile }) {
  const { t } = useTranslation()
  const [tempFilters, setTempFilters] = useState(data.filters)
  const { perms } = useStatic((state) => state.auth)

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
        <Grid
          container
          spacing={2}
          direction="row"
          justifyContent="center"
          alignItems="center"
          style={{
            width: 300,
            border: 'black 4px solid',
            borderRadius: 20,
            margin: 10,
          }}
        >
          {Object.keys(tempFilters.pokestops).map((subItem) => {
            if (subItem === 'filter') {
              return null
            }
            return (
              <ItemToggle
                key={subItem}
                category="pokestops"
                filters={tempFilters}
                setFilters={setTempFilters}
                subItem={subItem}
              />
            )
          })}
          <Grid
            item
            xs={t('drawer_grid_options_width')}
            style={{ textAlign: 'center' }}
          >
            <Button
              onClick={toggleDialog(true, 'pokestops', 'options')}
              variant="contained"
              color="secondary"
              startIcon={<Settings style={{ color: 'white' }} />}
            >
              {t('options')}
            </Button>
          </Grid>
          <Grid
            item
            xs={t('drawer_grid_advanced_width')}
            style={{ textAlign: 'center' }}
          >
            <Button
              onClick={toggleDialog(true, 'pokestops', 'filters')}
              variant="contained"
              color="primary"
              disabled={!permCheck}
            >
              {t('advanced')}
            </Button>
          </Grid>
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
