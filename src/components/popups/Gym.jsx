/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import { ExpandMore, Map, MoreVert } from '@material-ui/icons'
import { useStore, useMasterfile } from '../../hooks/useStore'
import useStyles from '../../hooks/useStyles'
import Utility from '../../services/Utility'

const getTeam = teamId => {
  switch (parseInt(teamId)) {
    default: return 'neutral'
    case 1: return 'mystic'
    case 2: return 'valor'
    case 3: return 'instinct'
  }
}

export default function GymPopup({ gym, hasRaid, ts }) {
  const { menus: { gyms: perms } } = useMasterfile(state => state.ui)
  const [raidExpand, setRaidExpand] = useState(hasRaid)
  const [extraExpand, setExtraExpand] = useState(false)

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Header gym={gym} perms={perms} />
      {perms.gyms && (
        <Grid item xs={12}>
          <Collapse in={!raidExpand} timeout="auto" unmountOnExit>
            <Grid
              container
              alignItems="center"
              justify="space-evenly"
              spacing={1}
            >
              <PoiImage gym={gym} />
              <Divider orientation="vertical" flexItem />
              <GymInfo
                gym={gym}
              />
            </Grid>
          </Collapse>
        </Grid>
      )}
      {perms.raids && (
        <Grid item xs={12}>
          <Collapse in={raidExpand} timeout="auto" unmountOnExit>
            <Grid
              container
              alignItems="center"
              justify="center"
              spacing={1}
            >
              <RaidImage gym={gym} ts={ts} />
              <Divider orientation="vertical" flexItem />
              <RaidInfo gym={gym} />
              <Timer gym={gym} ts={ts} />
            </Grid>
          </Collapse>
        </Grid>
      )}
      <Footer
        gym={gym}
        expanded={extraExpand}
        setExpanded={setExtraExpand}
        raidExpand={raidExpand}
        setRaidExpand={setRaidExpand}
        hasRaid={hasRaid}
        perms={perms}
      />
      {perms.gyms && (
        <Collapse in={extraExpand} timeout="auto" unmountOnExit>
          <ExtraInfo gym={gym} />
        </Collapse>
      )}
    </Grid>
  )
}

const Header = ({ gym, perms }) => {
  const hideList = useMasterfile(state => state.hideList)
  const setHideList = useMasterfile(state => state.setHideList)
  const excludeList = useMasterfile(state => state.excludeList)
  const setExcludeList = useMasterfile(state => state.setExcludeList)
  const timerList = useMasterfile(state => state.timerList)
  const setTimerList = useMasterfile(state => state.setTimerList)

  const [anchorEl, setAnchorEl] = useState(false)
  const [gymName, setGymName] = useState(true)
  const open = Boolean(anchorEl)
  const {
    id, team_id, raid_pokemon_id, raid_pokemon_form, raid_level,
  } = gym
  const name = gym.name || 'Unknown Gym Name'

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    setHideList([...hideList, id])
  }

  const excludeTeam = () => {
    setAnchorEl(null)
    setExcludeList([...excludeList, `t${team_id}-0`])
  }

  const excludeBoss = () => {
    setAnchorEl(null)
    if (raid_pokemon_id == 0) {
      setExcludeList([...excludeList, `e${raid_level}`])
    } else {
      setExcludeList([...excludeList, `p${raid_pokemon_id}-${raid_pokemon_form}`])
    }
  }

  const handleTimer = () => {
    setAnchorEl(null)
    setTimerList([...timerList, id])
  }

  let maxGymName = name.substring(0, Math.min(name.length, 30))
  if (maxGymName !== name) {
    maxGymName = `${maxGymName.trim()}...`
  }

  const options = [
    { name: 'Hide', action: handleHide },
  ]

  if (perms.gyms) {
    options.push({ name: 'Exclude Team', action: excludeTeam })
  }
  if (perms.raids) {
    options.push(
      { name: 'Exclude Raid', action: excludeBoss },
      { name: 'Timer', action: handleTimer },
    )
  }

  return (
    <>
      <Grid item xs={9}>
        <Typography
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          align="center"
          noWrap={gymName}
          onClick={() => setGymName(!gymName)}
        >
          {maxGymName}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert />
        </IconButton>
      </Grid>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            width: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.name} onClick={option.action}>
            {option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const PoiImage = ({ gym }) => {
  const { url, team_id, name } = gym
  const teamName = getTeam(team_id)
  const src = url
    ? url.replace('http://', 'https://')
    : `/images/team/${team_id}.png`

  return (
    <Grid
      item
      xs={6}
    >
      <a
        href={url}
        alt={name || teamName}
        target="_blank"
        rel="noreferrer"
      >
        <img
          src={src}
          alt={name || teamName}
          className={`circle-image ${teamName}`}
          style={{
            maxHeight: 75,
            maxWidth: 75,
          }}
        />
      </a>
    </Grid>

  )
}

const RaidImage = ({ gym, ts }) => {
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_gender, raid_pokemon_costume, raid_pokemon_evolution,
    raid_battle_timestamp,
  } = gym
  const { icons: { path } } = useStore(state => state.settings)
  const availableForms = useMasterfile(state => state.availableForms)
  const { pokemon } = useMasterfile(state => state.masterfile)

  let src = `/images/egg/${raid_level}.png`
  if (raid_pokemon_id !== 0 && raid_pokemon_id !== null) {
    src = `${path}/${Utility.getPokemonIcon(availableForms, raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume)}.png`
  } else if (ts >= raid_battle_timestamp) {
    src = `/images/unknown_egg/${raid_level}.png`
  }

  const getRaidTypes = (id, form) => {
    if (pokemon[id].forms[form]) {
      if (pokemon[id].forms[form].types) {
        return pokemon[id].forms[form].types
      }
    }
    return pokemon[id].types
  }

  return (
    <Grid
      container
      item
      xs={5}
      justify="center"
      alignItems="center"
    >
      <Grid
        item
        xs={12}
        style={{
          textAlign: 'center',
        }}
      >
        <img
          src={src}
          style={{
            maxHeight: 50,
            maxWidth: 50,
          }}
        />
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2">
          {`Tier ${raid_level}`}
        </Typography>
      </Grid>
      {(raid_pokemon_id > 0) && getRaidTypes(raid_pokemon_id, raid_pokemon_form).map(type => (
        <Grid
          item
          key={type}
          xs={4}
          className="grid-item"
          style={{
            height: 15,
            width: 15,
            backgroundImage: `url(/images/type/${type.toLowerCase()}.png)`,
          }}
        />
      ))}
      {(raid_pokemon_id > 0 && raid_pokemon_gender != 3) && (
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <Icon>{raid_pokemon_gender === 1 ? 'male' : 'female'}</Icon>
        </Grid>
      )}
    </Grid>
  )
}

const GymInfo = ({ gym }) => {
  const {
    team_id, availble_slots, ex_raid_eligible, ar_scan_eligible,
  } = gym

  return (
    <Grid
      item
      xs={5}
      container
      direction="row"
      justify="space-around"
      alignItems="center"
    >
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {Utility.getProperName(getTeam(team_id))}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" align="center">
          Slots: {availble_slots}
        </Typography>
      </Grid>
      {ex_raid_eligible && (
        <Grid
          item
          xs={6}
          className="grid-item"
          style={{
            height: 24,
            backgroundImage: 'url(/images/misc/ex.png)',
          }}
        />
      )}
      {(ar_scan_eligible !== 0 && ar_scan_eligible !== null) && (
        <Grid
          item
          xs={6}
          className="grid-item"
          style={{
            height: 24,
            backgroundImage: 'url(/images/misc/ar.png)',
          }}
        />
      )}
    </Grid>
  )
}

const RaidInfo = ({ gym }) => {
  const { moves, pokemon } = useMasterfile(state => state.masterfile)
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_move_1, raid_pokemon_move_2,
    raid_pokemon_evolution,
  } = gym

  const getRaidName = (raidLevel, id) => {
    if (id) {
      return pokemon[raid_pokemon_id].name
    }
    return `Tier ${raidLevel}`
  }

  const getRaidForm = (id, form, evo) => {
    if (evo) {
      return 'Mega'
    }
    if (form) {
      const raidForm = pokemon[id].forms[form].name
      if (raidForm === 'Normal') {
        return ''
      }
      return `${raidForm} Form`
    }
  }

  if (raid_pokemon_id === 0) {
    return (
      <Timer gym={gym} start />
    )
  }

  return (
    <Grid
      item
      xs={6}
      container
      justify="space-around"
      alignItems="center"
    >
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {getRaidName(raid_level, raid_pokemon_id)}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" align="center">
          {getRaidForm(raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution)}
        </Typography>
      </Grid>

      <Grid
        item
        xs={2}
        className="grid-item"
        style={{
          textAlign: 'center',
          height: 15,
          width: 15,
          backgroundImage: `url(/images/type/${moves[raid_pokemon_move_1].type.toLowerCase()}.png)`,
        }}
      />
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {moves[raid_pokemon_move_1].name}
        </Typography>
      </Grid>
      <Grid
        item
        xs={2}
        className="grid-item"
        style={{
          textAlign: 'center',
          height: 15,
          width: 15,
          backgroundImage: `url(/images/type/${moves[raid_pokemon_move_2].type.toLowerCase()}.png)`,
        }}
      />
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {moves[raid_pokemon_move_2].name}
        </Typography>
      </Grid>
    </Grid>
  )
}

const Timer = ({ gym, start }) => {
  const { raid_battle_timestamp, raid_end_timestamp } = gym
  const startTime = new Date(raid_battle_timestamp * 1000)
  const endTime = new Date(raid_end_timestamp * 1000)

  const [raidStart, setRaidStart] = useState(Utility.getTimeUntil(startTime, true))
  const [raidEnd, setRaidEnd] = useState(Utility.getTimeUntil(endTime, true))

  useEffect(() => {
    const timer = setTimeout(() => {
      setRaidStart(Utility.getTimeUntil(startTime, true))
      setRaidEnd(Utility.getTimeUntil(endTime, true))
    }, 1000)
    return () => clearTimeout(timer)
  })

  if (start) {
    return (
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle1">
          Starts: {startTime.toLocaleTimeString()}
        </Typography>
        <Typography variant="h6">
          {raidStart.str}
        </Typography>
      </Grid>
    )
  }
  return (
    <Grid item xs={12} style={{ textAlign: 'center' }}>
      <Typography variant="subtitle1">
        End: {endTime.toLocaleTimeString()}
      </Typography>
      <Typography variant="h6">
        {raidEnd.str}
      </Typography>
    </Grid>
  )
}

const Footer = ({
  gym, expanded, setExpanded, hasRaid, raidExpand, setRaidExpand, perms,
}) => {
  const classes = useStyles()
  const { navigation: { url } } = useStore(state => state.settings)

  const { lat, lon } = gym

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleRaidClick = () => {
    setRaidExpand(!raidExpand)
  }

  return (
    <>
      {(hasRaid && perms.raids && perms.gyms) && (
        <Grid item xs={4}>
          <IconButton
            className={classes.expand}
            onClick={handleRaidClick}
            aria-expanded={raidExpand}
          >
            <img
              src={`/images/misc/${raidExpand ? 'gyms' : 'raids'}.png`}
              height={20}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid item xs={4} style={{ textAlign: 'center' }}>
        <IconButton
          href={url.replace('{x}', lat).replace('{y}', lon)}
          target="_blank"
          rel="noreferrer"
        >
          <Map style={{ color: 'white' }} />
        </IconButton>
      </Grid>
      {perms.gyms && (
        <Grid item xs={4}>
          <IconButton
            className={expanded ? classes.expandOpen : classes.expand}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMore />
          </IconButton>
        </Grid>
      )}
    </>
  )
}

const ExtraInfo = ({ gym }) => {
  const { pokemon } = useMasterfile(state => state.masterfile)
  const {
    last_modified_timestamp, updated, total_cp, guarding_pokemon_id,
  } = gym

  const extraMetaData = [
    {
      description: 'Defender',
      data: pokemon[guarding_pokemon_id].name,
    },
    {
      description: 'Total CP:',
      data: total_cp,
    },
    {
      description: 'Last Seen:',
      data: (new Date(updated * 1000)).toLocaleTimeString(),
    },
    {
      description: 'Last Modified:',
      data: (new Date(last_modified_timestamp * 1000)).toLocaleTimeString(),
    },
  ]

  return (
    <Grid
      container
      alignItems="center"
      justify="center"
    >
      {extraMetaData.map(meta => (
        <Fragment key={meta.description}>
          <Grid item xs={5} style={{ textAlign: 'left' }}>
            <Typography variant="caption" align="center">
              {meta.description}
            </Typography>
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {meta.data}
            </Typography>
          </Grid>
        </Fragment>
      ))}
    </Grid>
  )
}
