/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import { ExpandMore, Map, MoreVert } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Utility from '@services/Utility'

export default function GymPopup({
  gym, hasRaid, ts, path, availableForms,
}) {
  const { t } = useTranslation()
  const { gyms: perms } = useStatic(state => state.ui)
  const [raidExpand, setRaidExpand] = useState(hasRaid)
  const [extraExpand, setExtraExpand] = useState(false)

  return (
    <Grid
      container
      style={{ width: 200 }}
      direction="row"
      justifyContent="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Header gym={gym} perms={perms} hasRaid={hasRaid} t={t} />
      {perms.gyms && (
        <Grid item xs={12}>
          <Collapse in={!raidExpand} timeout="auto" unmountOnExit>
            <Grid
              container
              alignItems="center"
              justifyContent="space-evenly"
              spacing={1}
            >
              <PoiImage gym={gym} />
              <Divider orientation="vertical" flexItem />
              <GymInfo
                gym={gym}
                t={t}
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
              justifyContent="center"
              spacing={1}
            >
              <RaidImage
                gym={gym}
                ts={ts}
                path={path}
                availableForms={availableForms}
                t={t}
              />
              <Divider orientation="vertical" flexItem />
              <RaidInfo gym={gym} t={t} />
              <Timer gym={gym} ts={ts} t={t} />
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
        t={t}
      />
      {perms.gyms && (
        <Collapse in={extraExpand} timeout="auto" unmountOnExit>
          <ExtraInfo gym={gym} t={t} ts={ts} />
        </Collapse>
      )}
    </Grid>
  )
}

const Header = ({
  gym, perms, hasRaid, t,
}) => {
  const hideList = useStatic(state => state.hideList)
  const setHideList = useStatic(state => state.setHideList)
  const excludeList = useStatic(state => state.excludeList)
  const setExcludeList = useStatic(state => state.setExcludeList)
  const timerList = useStatic(state => state.timerList)
  const setTimerList = useStatic(state => state.setTimerList)
  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)

  const [anchorEl, setAnchorEl] = useState(false)
  const [gymName, setGymName] = useState(true)
  const open = Boolean(anchorEl)
  const {
    id, team_id, raid_pokemon_id, raid_pokemon_form, raid_level,
  } = gym
  const name = gym.name || t('unknownGym')

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
    const key = `t${team_id}-0`
    setFilters({
      ...filters,
      gyms: {
        ...filters.gyms,
        filter: {
          ...filters.gyms.filter,
          [key]: {
            ...filters.gyms.filter[key],
            enabled: false,
          },
        },
      },
    })
    setExcludeList([...excludeList, key])
  }

  const excludeBoss = () => {
    setAnchorEl(null)
    let key = `e${raid_level}`
    if (raid_pokemon_id > 0) {
      key = `${raid_pokemon_id}-${raid_pokemon_form}`
    }
    setFilters({
      ...filters,
      gyms: {
        ...filters.gyms,
        filter: {
          ...filters.gyms.filter,
          [key]: {
            ...filters.gyms.filter[key],
            enabled: false,
          },
        },
      },
    })
    setExcludeList([...excludeList, key])
  }

  const handleTimer = () => {
    setAnchorEl(null)
    if (timerList.includes(id)) {
      setTimerList(timerList.filter(x => x !== id))
    } else {
      setTimerList([...timerList, id])
    }
  }

  const options = [
    { name: 'hide', action: handleHide },
  ]

  if (perms.gyms) {
    options.push({ name: 'excludeTeam', action: excludeTeam })
  }
  if (perms.raids && hasRaid) {
    options.push(
      { name: 'excludeRaid', action: excludeBoss },
      { name: 'timer', action: handleTimer },
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
          {name}
        </Typography>
      </Grid>
      <Grid item xs={3}>
        <IconButton
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVert style={{ color: 'white' }} />
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
            {t(option.name)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const PoiImage = ({ gym }) => {
  const { url, team_id, name } = gym
  const src = url
    ? url.replace('http://', 'https://')
    : `/images/team/${team_id}.png`

  return (
    <Grid
      item
      xs={6}
    >
      <img
        src={src}
        alt={name || 'unknown'}
        className={`circle-image team-${team_id}`}
        style={{
          maxHeight: 75,
          maxWidth: 75,
        }}
      />
    </Grid>

  )
}

const RaidImage = ({
  gym, ts, path, availableForms, t,
}) => {
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_gender, raid_pokemon_costume, raid_pokemon_evolution,
    raid_battle_timestamp,
  } = gym
  const { pokemon } = useStatic(state => state.masterfile)

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
      justifyContent="center"
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
          {`${t('tier')} ${raid_level}`}
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

const GymInfo = ({ gym, t }) => {
  const {
    team_id, availble_slots, ex_raid_eligible, ar_scan_eligible,
  } = gym

  return (
    <Grid
      item
      xs={5}
      container
      direction="row"
      justifyContent="space-around"
      alignItems="center"
    >
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {t(`team_${team_id}`)}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" align="center">
          {availble_slots} {t('slots')}
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

const RaidInfo = ({ gym, t }) => {
  const { moves, pokemon } = useStatic(state => state.masterfile)
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_move_1, raid_pokemon_move_2,
    raid_pokemon_evolution,
  } = gym

  const getRaidName = (raidLevel, id) => {
    if (id) {
      return t(`poke_${raid_pokemon_id}`)
    }
    return `${t('tier')} ${raidLevel}`
  }

  const getRaidForm = (id, form, evo) => {
    if (evo) {
      return t('mega')
    }
    if (form) {
      const raidForm = pokemon[id].forms[form].name
      if (raidForm === 'Normal') {
        return ''
      }
      return `${raidForm} ${t('form')}`
    }
  }

  if (!raid_pokemon_id) {
    return (
      <Timer gym={gym} start t={t} />
    )
  }

  return (
    <Grid
      item
      xs={6}
      container
      justifyContent="space-around"
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
      {raid_pokemon_move_1 && raid_pokemon_move_1 !== 1 && (
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
      )}
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {t(`move_${raid_pokemon_move_1}`)}
        </Typography>
      </Grid>
      {raid_pokemon_move_2 && raid_pokemon_move_2 !== 2 && (
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
      )}
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {t(`move_${raid_pokemon_move_2}`)}
        </Typography>
      </Grid>
    </Grid>
  )
}

const Timer = ({ gym, start, t }) => {
  const target = (start ? gym.raid_battle_timestamp : gym.raid_end_timestamp) * 1000
  const update = () => start || gym.raid_pokemon_id ? Utility.getTimeUntil(target, true)
    : Utility.formatInterval(target - gym.raid_battle_timestamp * 1000)
  const [display, setDisplay] = useState(update)

  useEffect(() => {
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  return (
    <Grid item xs={start ? 6 : 12} style={{ textAlign: 'center' }}>
      <Typography variant="subtitle1">
        {t(start ? 'starts' : 'ends')}: {new Date(target).toLocaleTimeString(localStorage.getItem('i18nextLng'))}
      </Typography>
      <Typography variant="h6">
        {display.str}
      </Typography>
    </Grid>
  )
}

const Footer = ({
  gym, expanded, setExpanded, hasRaid, raidExpand, setRaidExpand, perms,
}) => {
  const classes = useStyles()
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)
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
            <ExpandMore style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      )}
    </>
  )
}

const ExtraInfo = ({ gym, t, ts }) => {
  const {
    last_modified_timestamp, updated, total_cp, guarding_pokemon_id,
  } = gym

  const extraMetaData = [
    {
      description: 'defender',
      data: t(`poke_${guarding_pokemon_id}`),
    },
    {
      description: 'totalCP',
      data: total_cp,
    },
    {
      description: 'lastSeen',
      data: Utility.dayCheck(ts, updated),
    },
    {
      description: 'lastModified',
      data: Utility.dayCheck(ts, last_modified_timestamp),
    },
  ]

  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
    >
      {extraMetaData.map(meta => (
        <Fragment key={meta.description}>
          <Grid item xs={5} style={{ textAlign: 'left' }}>
            <Typography variant="caption" align="center">
              {t(meta.description)}:
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
