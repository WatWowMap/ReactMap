/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Icon, Collapse, IconButton, Divider,
} from '@material-ui/core'
import { ExpandMore, Map, MoreVert } from '@material-ui/icons'
import { useTranslation, Trans } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import useWebhook from '@hooks/useWebhook'
import Utility from '@services/Utility'

import Title from './common/Title'
import Dropdown from './common/Dropdown'
import GenericTimer from './common/Timer'

export default function GymPopup({
  gym, hasRaid, ts, Icons, hasHatched,
}) {
  const { t } = useTranslation()
  const { perms } = useStatic(state => state.auth)
  const popups = useStore(state => state.popups)
  const setPopups = useStore(state => state.setPopups)

  useEffect(() => {
    Utility.analytics('Popup', `Team ID: ${gym.team_id} Has Raid: ${hasRaid}`, 'Gym')
  }, [])

  return (
    <Grid
      container
      style={{ width: 200 }}
      direction="row"
      justifyContent="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Grid item xs={10}>
        <Title
          mainName={gym.name}
          backup={t('unknown_gym')}
        />
      </Grid>
      <MenuActions
        gym={gym}
        perms={perms}
        hasRaid={hasRaid}
        t={t}
      />
      {perms.gyms && (
        <Grid item xs={12}>
          <Collapse in={!popups.raids || !hasRaid} timeout="auto" unmountOnExit>
            <Grid
              container
              alignItems="center"
              justifyContent="space-evenly"
              spacing={1}
            >
              <PoiImage
                Icons={Icons}
                gym={gym}
              />
              <Divider orientation="vertical" flexItem />
              <GymInfo
                gym={gym}
                t={t}
                Icons={Icons}
              />
            </Grid>
          </Collapse>
        </Grid>
      )}
      {perms.raids && (
        <Grid item xs={12}>
          <Collapse in={popups.raids && hasRaid} timeout="auto" unmountOnExit>
            <Grid
              container
              alignItems="center"
              justifyContent="center"
              spacing={1}
            >
              <RaidImage
                gym={gym}
                ts={ts}
                Icons={Icons}
                t={t}
              />
              <Divider orientation="vertical" flexItem />
              <RaidInfo gym={gym} t={t} Icons={Icons} ts={ts} />
              {Boolean(gym.raid_pokemon_id && gym.raid_battle_timestamp >= ts)
                && <Timer gym={gym} start t={t} />}
              <Timer gym={gym} ts={ts} t={t} hasHatched={hasHatched} />
            </Grid>
          </Collapse>
        </Grid>
      )}
      <Footer
        gym={gym}
        popups={popups}
        setPopups={setPopups}
        hasRaid={hasRaid}
        perms={perms}
        t={t}
        Icons={Icons}
      />
      {perms.gyms && (
        <Collapse in={popups.extras} timeout="auto" unmountOnExit>
          <ExtraInfo gym={gym} t={t} ts={ts} />
        </Collapse>
      )}
    </Grid>
  )
}

const MenuActions = ({
  gym, perms, hasRaid, t,
}) => {
  const hideList = useStatic(state => state.hideList)
  const setHideList = useStatic(state => state.setHideList)
  const excludeList = useStatic(state => state.excludeList)
  const setExcludeList = useStatic(state => state.setExcludeList)
  const timerList = useStatic(state => state.timerList)
  const setTimerList = useStatic(state => state.setTimerList)

  const selectedWebhook = useStore(state => state.selectedWebhook)

  const filters = useStore(state => state.filters)
  const setFilters = useStore(state => state.setFilters)

  const [anchorEl, setAnchorEl] = useState(false)

  const addWebhook = useWebhook({ category: 'quickGym', selectedWebhook })
  const {
    id, team_id, raid_pokemon_id, raid_pokemon_form, raid_level,
  } = gym

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
    options.push({ name: 'exclude_team', action: excludeTeam })
  }
  if (perms.raids && hasRaid) {
    options.push(
      { name: 'exclude_raid', action: excludeBoss },
      { name: 'timer', action: handleTimer },
    )
  }
  if (perms.webhooks?.includes(selectedWebhook)) {
    options.push({
      name: (
        <Trans i18nKey="webhook_entry">
          {{ category: t('gym') }}{{ name: selectedWebhook }}
        </Trans>
      ),
      action: () => addWebhook(gym),
      key: 'webhook',
    })
  }

  return (
    <Grid item xs={2} style={{ textAlign: 'right' }}>
      <IconButton
        aria-haspopup="true"
        onClick={handleClick}
      >
        <MoreVert style={{ color: 'white' }} />
      </IconButton>
      <Dropdown
        anchorEl={anchorEl}
        handleClose={handleClose}
        options={options}
      />
    </Grid>
  )
}

const PoiImage = ({ gym, Icons }) => {
  const { url, team_id, name } = gym
  const src = url
    ? url.replace('http://', 'https://')
    : Icons.getTeams(team_id)

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
  gym, ts, Icons, t,
}) => {
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_gender, raid_pokemon_costume, raid_pokemon_evolution,
    raid_battle_timestamp, raid_is_exclusive,
  } = gym
  const { pokemon } = useStatic(state => state.masterfile)

  const src = raid_pokemon_id
    ? Icons.getPokemon(
      raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume,
    )
    : Icons.getEggs(raid_level, raid_battle_timestamp < ts, raid_is_exclusive)

  const getRaidTypes = (id, form) => {
    if (pokemon[id].forms[form] && pokemon[id].forms[form].types) {
      return pokemon[id].forms[form].types
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
            backgroundImage: `url(${Icons.getTypes(type)})`,
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

const GymInfo = ({ gym, t, Icons }) => {
  const {
    team_id, available_slots, ex_raid_eligible, ar_scan_eligible,
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
          {available_slots} {t('slots')}
        </Typography>
      </Grid>
      {ex_raid_eligible && (
        <Grid
          item
          xs={6}
          className="grid-item"
          style={{
            height: 24,
            backgroundImage: `url(${Icons.getMisc('ex')})`,
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
            backgroundImage: `url(${Icons.getMisc('ar')})`,
          }}
        />
      )}
    </Grid>
  )
}

const RaidInfo = ({
  gym, t, Icons,
}) => {
  const { moves, pokemon } = useStatic(state => state.masterfile)
  const {
    raid_level, raid_pokemon_id, raid_pokemon_form, raid_pokemon_move_1, raid_pokemon_move_2,
    raid_pokemon_evolution,
  } = gym

  if (!raid_pokemon_id) {
    return (
      <Timer gym={gym} start t={t} />
    )
  }

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
            backgroundImage: `url(${Icons.getTypes(moves[raid_pokemon_move_1].type)})`,
          }}
        />
      )}
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {t(`move_${raid_pokemon_move_1}`)}
        </Typography>
      </Grid>
      {(raid_pokemon_move_2 && raid_pokemon_move_2 !== 2) && (
        <Grid
          item
          xs={2}
          className="grid-item"
          style={{
            textAlign: 'center',
            height: 15,
            width: 15,
            backgroundImage: `url(${Icons.getTypes(moves[raid_pokemon_move_2].type)})`,
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

const Timer = ({
  gym, start, t, hasHatched,
}) => {
  const target = (start ? gym.raid_battle_timestamp : gym.raid_end_timestamp) * 1000
  const update = () => start || hasHatched || gym.raid_pokemon_id
    ? Utility.getTimeUntil(target, true)
    : Utility.formatInterval(target - gym.raid_battle_timestamp * 1000)
  const [display, setDisplay] = useState(update)

  useEffect(() => {
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  return (
    <Grid item xs={start && !gym.raid_pokemon_id ? 6 : 12} style={{ textAlign: 'center' }}>
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
  gym, popups, setPopups, hasRaid, perms, Icons,
}) => {
  const classes = useStyles()
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)
  const { lat, lon } = gym

  const handleExpandClick = (category) => {
    setPopups({
      ...popups, [category]: !popups[category],
    })
  }

  return (
    <>
      {(hasRaid && perms.raids && perms.gyms) && (
        <Grid item xs={4}>
          <IconButton
            className={classes.expand}
            onClick={() => handleExpandClick('raids')}
            aria-expanded={popups.raids}
          >
            <img
              src={Icons.getMisc(popups.raids ? 'gyms' : 'raids')}
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
            className={popups.extras ? classes.expandOpen : classes.expand}
            onClick={() => handleExpandClick('extras')}
            aria-expanded={popups.extras}
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
      description: 'total_cp',
      data: total_cp,
    },
    {
      description: 'last_seen',
      timer: <GenericTimer expireTime={updated} />,
      data: Utility.dayCheck(ts, updated),
    },
    {
      description: 'last_modified',
      timer: <GenericTimer expireTime={last_modified_timestamp} />,
      data: Utility.dayCheck(ts, last_modified_timestamp),
    },
  ]

  return (
    <Grid container>
      {extraMetaData.map(meta => (
        meta.data ? (
          <Fragment key={meta.description}>
            <Grid item xs={t('popup_gym_description_width')} style={{ textAlign: 'left' }}>
              <Typography variant="caption">
                {t(meta.description)}:
              </Typography>
            </Grid>
            {meta.timer ? (
              <Grid item xs={t('popup_gym_seen_timer_width')} style={{ textAlign: 'right' }}>
                {meta.timer}
              </Grid>
            ) : null}
            <Grid item xs={meta.timer ? t('popup_gym_data_width') : t('popup_gym_seen_timer_width')} style={{ textAlign: 'right' }}>
              <Typography variant="caption">
                {meta.data}
              </Typography>
            </Grid>
          </Fragment>
        ) : null
      ))}
    </Grid>
  )
}
