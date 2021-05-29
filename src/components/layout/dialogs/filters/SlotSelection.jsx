import React, { useState } from 'react'
import {
  Grid, DialogTitle, DialogContent, DialogActions, IconButton, Button, Typography,
} from '@material-ui/core'
import {
  Clear, Replay, Save, Check,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Size from './Size'

export default function SlotSelection({ teamId, toggleSlotsMenu, tempFilters }) {
  const classes = useStyles()
  const isMobile = useStatic(state => state.breakpoint) === 'xs'
  const { t } = useTranslation()
  const [filterValues, setFilterValues] = useState(tempFilters)
  const [team] = useState(`t${teamId}-0`)

  const relevantSlots = Object.keys(filterValues).filter(each => each.charAt(0) === 'g' && each.charAt(1) === teamId)

  const handleSizeChange = (name, value) => {
    const slotsObj = filterValues
    if (name === 'default') {
      const resetValues = { enabled: true, size: 'md' }
      slotsObj[team] = resetValues
      relevantSlots.forEach(slot => slotsObj[slot] = resetValues)
    } else {
      slotsObj[team].size = value
      relevantSlots.forEach(slot => slotsObj[slot].size = value)
    }
    setFilterValues({ ...slotsObj })
  }

  if (relevantSlots.every(val => filterValues[val].enabled === false) && filterValues[team].enabled) {
    setFilterValues({ ...filterValues, [team]: { ...filterValues[team], enabled: false } })
  }

  const reset = {
    key: 'reset',
    icon: (
      <IconButton
        onClick={() => handleSizeChange('default')}
      >
        <Replay color="primary" />
      </IconButton>
    ),
    text: (
      <Button onClick={() => handleSizeChange('default')}>
        <Typography variant="caption" color="primary">
          {t('reset')}
        </Typography>
      </Button>
    ),
  }
  const save = {
    key: 'save',
    icon: (
      <IconButton
        onClick={toggleSlotsMenu(false, teamId, filterValues)}
      >
        <Save color="secondary" />
      </IconButton>
    ),
    text: (
      <Button onClick={toggleSlotsMenu(false, teamId, filterValues)}>
        <Typography color="secondary" variant="caption">
          {t('save')}
        </Typography>
      </Button>
    ),
  }

  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        {t(`team${teamId}`)} {t('slotSelection')}
        <IconButton
          onClick={toggleSlotsMenu(false)}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear />
        </IconButton>
      </DialogTitle>
      <DialogContent style={{ color: 'white' }}>
        <Grid
          container
          direction="row"
          justify="center"
          alignItems="center"
        >
          {relevantSlots.map(each => (
            <Grid
              container
              item
              key={each}
              xs={12}
              sm={6}
              direction="row"
              alignItems="center"
              justify="center"
            >
              <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`/images/gym/${each.slice(1).replace('-', '_')}.png`} style={{ maxWidth: 50, maxHeight: 50 }} />
              </Grid>
              <Grid item xs={8} style={{ textAlign: 'center' }}>
                <Size
                  filterValues={filterValues[each]}
                  handleChange={(name, value) => {
                    setFilterValues({
                      ...filterValues,
                      [each]: {
                        ...filterValues[each],
                        [name]: value,
                      },
                    })
                  }}
                  btnSize="small"
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => {
                  setFilterValues({
                    ...filterValues,
                    [each]: {
                      ...filterValues[each],
                      enabled: !filterValues[each].enabled,
                    },
                  })
                }}
                >
                  {filterValues[each].enabled
                    ? <Check style={{ color: '#00e676' }} />
                    : <Clear color="primary" />}
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Grid
          container
          justify="center"
          alignItems="center"
        >
          <Grid item xs={8}>
            <Size
              filterValues={filterValues[team]}
              handleChange={handleSizeChange}
              btnSize="medium"
            />
          </Grid>
          {[reset, save].map(button => (
            <Grid item xs={2} key={button.key}>
              {isMobile ? button.icon : button.text}
            </Grid>
          ))}
        </Grid>
      </DialogActions>
    </>
  )
}
