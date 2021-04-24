/* eslint-disable no-nested-ternary */
import React from 'react'
import { Grid, IconButton, Typography } from '@material-ui/core'
import { Check, Clear, Menu } from '@material-ui/icons'
import Utility from '../../../../services/Utility'
import useStyles from '../../../../assets/mui/styling'

const PokemonTile = ({
  data, rowIndex, columnIndex, style,
}) => {
  const classes = useStyles()
  const {
    pkmn, columnCount, tempFilters, setTempFilters, toggleAdvMenu, url, availableForms,
  } = data

  const item = pkmn[rowIndex * columnCount + columnIndex]

  const bgColor = columnIndex % 2
    ? rowIndex % 2 === 0
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'
    : rowIndex % 2
      ? 'rgba(1, 1, 1, 0.01)'
      : 'rgba(240, 240, 240, 0.01)'

  return (
    <>
      {item && (
        <Grid
          style={{ ...style, backgroundColor: bgColor }}
          container
          justify="center"
          alignItems="center"
        >
          <Grid item xs={8}>
            <div className={classes.gridItem} style={{ backgroundImage: `url(${url}/${Utility.getPokemonIcon(availableForms, ...item.id.split('-'))}.png)` }} />
          </Grid>
          <Grid
            container
            item
            xs={4}
            direction="column"
            justify="center"
            alignItems="center"
          >
            <Grid item>
              <IconButton onClick={() => {
                setTempFilters({
                  ...tempFilters,
                  [item.id]: {
                    ...tempFilters[item.id],
                    enabled: !tempFilters[item.id].enabled,
                  },
                })
              }}
              >
                {tempFilters[item.id].enabled ? <Check style={{ color: 'green' }} />
                  : <Clear style={{ color: 'red' }} />}
              </IconButton>
            </Grid>
            <Grid item>
              <IconButton
                onClick={toggleAdvMenu(true, item.id)}
              >
                <Menu style={{ color: 'white' }} />
              </IconButton>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" align="center">{item.name}</Typography>
          </Grid>
        </Grid>
      )}
    </>
  )
}

export default PokemonTile
