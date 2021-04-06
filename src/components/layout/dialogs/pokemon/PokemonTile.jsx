import React from 'react'
import { Grid, IconButton } from '@material-ui/core'
import { Check, Clear, Menu } from '@material-ui/icons'
import { useStore } from '../../../../hooks/useStore'
import Utility from '../../../../services/Utility'
import useStyles from '../../../../assets/mui/styling'

export default function PokemonTile({
  tempFilters, setTempFilters, toggleAdvMenu, pokemon,
}) {
  const classes = useStyles()

  return (
    <Grid
      container
      item
      xs={6}
      sm={4}
      md={3}
      key={pokemon.id}
      justify="center"
      alignItems="center"
    >
      <Grid item xs={8}>
        <div className={classes.gridItem} style={{ backgroundImage: `url(${useStore(state => state.settings).iconStyle.path}/${Utility.getPokemonIcon(pokemon.i, pokemon.formId)}.png)` }} />
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
              [pokemon.id]: {
                ...tempFilters[pokemon.id],
                enabled: !tempFilters[pokemon.id].enabled,
              },
            })
          }}
          >
            {tempFilters[pokemon.id].enabled ? <Check style={{ color: 'green' }} />
              : <Clear style={{ color: 'red' }} />}
          </IconButton>
        </Grid>
        <Grid item>
          <IconButton
            onClick={toggleAdvMenu(true, pokemon.id)}
          >
            <Menu style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      </Grid>
    </Grid>
  )
}
