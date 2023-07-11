import React, { Fragment, useState, useEffect } from 'react'
import ExpandMore from '@material-ui/icons/ExpandMore'
import MoreVert from '@material-ui/icons/MoreVert'
import {
  Grid,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Dialog,
} from '@material-ui/core'

import { useTranslation, Trans } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import useWebhook from '@hooks/useWebhook'
import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

import Title from './common/Title'
import Dropdown from './common/Dropdown'
import GenericTimer from './common/Timer'
import BadgeSelection from '../layout/dialogs/BadgeSelection'
import PowerUp from './common/PowerUp'
import GenderIcon from './common/GenderIcon'
import Navigation from './common/Navigation'
import Coords from './common/Coords'

export default function GymPopup({
  gym,
  hasRaid,
  ts,
  Icons,
  hasHatched,
  badge,
  setBadge,
  userSettings,
}) {
  const { t } = useTranslation()
  const { perms } = useStatic((state) => state.auth)
  const popups = useStore((state) => state.popups)
  const setPopups = useStore((state) => state.setPopups)

  useEffect(() => {
    Utility.analytics(
      'Popup',
      `Team ID: ${gym.team_id} Has Raid: ${hasRaid}`,
      'Gym',
    )
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        style={{ width: 200 }}
        direction="row"
        justifyContent="space-evenly"
        alignItems="center"
        spacing={1}
      >
        <Grid item xs={10}>
          <Title mainName={gym.name} backup={t('unknown_gym')} />
        </Grid>
        <MenuActions
          gym={gym}
          perms={perms}
          hasRaid={hasRaid}
          t={t}
          badge={badge}
          setBadge={setBadge}
        />
        {perms.gyms && (
          <Grid item xs={12}>
            <Collapse
              in={!popups.raids || !hasRaid}
              timeout="auto"
              unmountOnExit
            >
              <Grid
                container
                alignItems="center"
                justifyContent="space-evenly"
                spacing={1}
              >
                <PoiImage Icons={Icons} gym={gym} />
                <Divider orientation="vertical" flexItem />
                <GymInfo gym={gym} t={t} Icons={Icons} />
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
                <RaidImage gym={gym} ts={ts} Icons={Icons} t={t} />
                <Divider orientation="vertical" flexItem />
                <RaidInfo gym={gym} t={t} Icons={Icons} ts={ts} />
                {Boolean(
                  gym.raid_pokemon_id && gym.raid_battle_timestamp >= ts,
                ) && <Timer gym={gym} start t={t} />}
                <Timer gym={gym} ts={ts} t={t} hasHatched={hasHatched} />
              </Grid>
            </Collapse>
          </Grid>
        )}
        <PowerUp {...gym} />
        <GymFooter
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
            <ExtraInfo gym={gym} userSettings={userSettings} t={t} ts={ts} />
          </Collapse>
        )}
      </Grid>
    </ErrorBoundary>
  )
}

const MenuActions = ({ gym, perms, hasRaid, badge, setBadge }) => {
  const hideList = useStatic((state) => state.hideList)
  const setHideList = useStatic((state) => state.setHideList)
  const excludeList = useStatic((state) => state.excludeList)
  const setExcludeList = useStatic((state) => state.setExcludeList)
  const timerList = useStatic((state) => state.timerList)
  const setTimerList = useStatic((state) => state.setTimerList)
  const { gymValidDataLimit } = useStatic((state) => state.config)

  const selectedWebhook = useStore((state) => state.selectedWebhook)
  const webhookData = useStatic((state) => state.webhookData)

  const filters = useStore((state) => state.filters)
  const setFilters = useStore((state) => state.setFilters)

  const [anchorEl, setAnchorEl] = useState(false)
  const [badgeMenu, setBadgeMenu] = useState(false)

  const addWebhook = useWebhook({ category: 'quickGym', selectedWebhook })
  const hasGymHook = webhookData?.[selectedWebhook]?.gym?.find(
    (x) => x.gym_id === gym.id,
  )
  const hasRaidHook = webhookData?.[selectedWebhook]?.raid?.find(
    (x) => x.gym_id === gym.id,
  )
  const hasEggHook = webhookData?.[selectedWebhook]?.egg?.find(
    (x) => x.gym_id === gym.id,
  )
  const hasWebhook = !!hasGymHook || !!hasRaidHook || !!hasEggHook
  const {
    id,
    team_id,
    raid_pokemon_id,
    raid_pokemon_form,
    raid_level,
    updated,
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

  const handleCloseBadge = (open) => {
    setAnchorEl(null)
    setBadgeMenu(open)
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
      setTimerList(timerList.filter((x) => x !== id))
    } else {
      setTimerList([...timerList, id])
    }
  }

  const options = [{ name: 'hide', action: handleHide }]

  if (perms.gyms) {
    if (updated > gymValidDataLimit) {
      options.push({ name: 'exclude_team', action: excludeTeam })
    }
    if (perms.gymBadges && filters.gyms?.gymBadges) {
      options.push({
        name: 'gym_badge_menu',
        action: () => handleCloseBadge(true),
      })
    }
  }
  if (perms.raids && hasRaid) {
    options.push(
      { name: 'exclude_raid', action: excludeBoss },
      { name: 'timer', action: handleTimer },
    )
  }
  perms.webhooks.forEach((hook) => {
    options.push({
      name: (
        <Trans i18nKey={hasWebhook ? 'remove_webhook_entry' : 'webhook_entry'}>
          {{ name: hook }}
        </Trans>
      ),
      action: () => {
        if (hasWebhook) {
          if (hasGymHook) addWebhook(hasGymHook.uid, 'gym-delete')
          if (hasRaidHook) addWebhook(hasRaidHook.uid, 'raid-delete')
          if (hasEggHook) addWebhook(hasEggHook.uid, 'egg-delete')
        } else {
          addWebhook(gym, 'quickGym')
        }
      },
      key: hook,
    })
  })

  return (
    <Grid item xs={2} style={{ textAlign: 'right' }}>
      <IconButton aria-haspopup="true" onClick={handleClick}>
        <MoreVert style={{ color: 'white' }} />
      </IconButton>
      <Dropdown
        anchorEl={anchorEl}
        handleClose={handleClose}
        options={options}
      />
      <Dialog open={badgeMenu} onClose={handleCloseBadge}>
        <BadgeSelection
          gym={gym}
          setBadgeMenu={handleCloseBadge}
          badge={badge}
          setBadge={setBadge}
        />
      </Dialog>
    </Grid>
  )
}

const PoiImage = ({ gym, Icons }) => {
  const { url, team_id, name } = gym
  const src = url ? url.replace('http://', 'https://') : Icons.getTeams(team_id)

  return (
    <Grid item xs={6}>
      <img
        src={src}
        alt={name || 'unknown'}
        className={`${
          gym.badge
            ? `badge badge-${gym.badge}`
            : `circle-image team-${team_id}`
        }`}
        style={{
          maxHeight: 75,
          maxWidth: 75,
        }}
      />
    </Grid>
  )
}

const RaidImage = ({ gym, ts, Icons, t }) => {
  const {
    raid_level,
    raid_pokemon_id,
    raid_pokemon_form,
    raid_pokemon_gender,
    raid_pokemon_costume,
    raid_pokemon_evolution,
    raid_pokemon_alignment,
    raid_battle_timestamp,
    raid_is_exclusive,
  } = gym
  const { pokemon } = useStatic((state) => state.masterfile)

  const src = raid_pokemon_id
    ? Icons.getPokemon(
        raid_pokemon_id,
        raid_pokemon_form,
        raid_pokemon_evolution,
        raid_pokemon_gender,
        raid_pokemon_costume,
        raid_pokemon_alignment,
      )
    : Icons.getEggs(raid_level, raid_battle_timestamp < ts, raid_is_exclusive)

  const getRaidTypes = (id, form) => {
    if (pokemon[id].forms?.[form]?.types) {
      return pokemon[id].forms[form].types
    }
    return pokemon[id]?.types || []
  }

  return (
    <Grid container item xs={5} justifyContent="center" alignItems="center">
      <Grid
        item
        xs={12}
        style={{
          textAlign: 'center',
        }}
      >
        <img
          src={src}
          alt={src}
          style={{
            maxHeight: 50,
            maxWidth: 50,
          }}
        />
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="caption">{t(`raid_${raid_level}`)}</Typography>
      </Grid>
      {raid_pokemon_id > 0 &&
        getRaidTypes(raid_pokemon_id, raid_pokemon_form).map((type) => (
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
      {!!raid_pokemon_gender && (
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <GenderIcon gender={raid_pokemon_gender} />
        </Grid>
      )}
    </Grid>
  )
}

const GymInfo = ({ gym, t, Icons }) => {
  const {
    team_id,
    available_slots,
    ex_raid_eligible,
    ar_scan_eligible,
    updated,
    badge,
  } = gym
  const { gymValidDataLimit } = useStatic((state) => state.config)

  return (
    <Grid
      item
      xs={5}
      container
      direction="row"
      justifyContent="space-around"
      alignItems="center"
    >
      {!!badge && (
        <Grid item xs={12}>
          <Typography variant="h6" align="center" className={`badge_${badge}`}>
            {t(`badge_${badge}`)}
          </Typography>
        </Grid>
      )}
      {updated > gymValidDataLimit && (
          <Grid item xs={12}>
            <Typography variant="h6" align="center">
              {t(`team_${team_id}`)}
            </Typography>
          </Grid>
        ) && (
          <Grid item xs={12}>
            <Typography variant="h6" align="center">
              {available_slots} {t('slots')}
            </Typography>
          </Grid>
        )}
      {ex_raid_eligible && (
        <Grid
          item
          xs={4}
          className="grid-item"
          style={{
            height: 24,
            backgroundImage: `url(${Icons.getMisc('ex')})`,
            backgroundSize: 'contain',
          }}
        />
      )}
      {ar_scan_eligible && (
        <Grid
          item
          xs={4}
          className="grid-item"
          style={{
            height: 24,
            backgroundImage: `url(${Icons.getMisc('ar')})`,
            backgroundSize: 'contain',
          }}
        />
      )}
      <Grid
        item
        xs={4}
        style={{
          background: `url(${Icons.getTeams(team_id)})`,
          height: 24,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    </Grid>
  )
}

const RaidInfo = ({ gym, t, Icons }) => {
  const { moves, pokemon } = useStatic((state) => state.masterfile)
  const {
    raid_level,
    raid_pokemon_id,
    raid_pokemon_form,
    raid_pokemon_costume,
    raid_pokemon_move_1,
    raid_pokemon_move_2,
  } = gym

  if (!raid_pokemon_id) {
    return <Timer gym={gym} start t={t} />
  }

  const getRaidName = (raidLevel, id) => {
    if (id) {
      return t(`poke_${raid_pokemon_id}`)
    }
    return `${t('tier')} ${raidLevel}`
  }

  const getRaidForm = (id, form, costume) => {
    if (costume) {
      return t(`costume_${costume}`, 'Unknown Costume')
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
      <Grid item xs={12} style={{ paddingBottom: 4, textAlign: 'center' }}>
        <Typography variant="caption" align="center">
          {getRaidForm(
            raid_pokemon_id,
            raid_pokemon_form,
            raid_pokemon_costume,
          )}
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
            backgroundImage: `url(${Icons.getTypes(
              moves[raid_pokemon_move_1].type,
            )})`,
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
            backgroundImage: `url(${Icons.getTypes(
              moves[raid_pokemon_move_2].type,
            )})`,
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

const Timer = ({ gym, start, t, hasHatched }) => {
  const target =
    (start ? gym.raid_battle_timestamp : gym.raid_end_timestamp) * 1000
  const update = () =>
    start || hasHatched || gym.raid_pokemon_id
      ? Utility.getTimeUntil(target, true)
      : Utility.formatInterval(target - gym.raid_battle_timestamp * 1000)
  const [display, setDisplay] = useState(update)

  useEffect(() => {
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  return target ? (
    <Grid
      item
      xs={start && !gym.raid_pokemon_id ? 6 : 12}
      style={{ textAlign: 'center' }}
    >
      <Typography variant="subtitle1">
        {t(start ? 'starts' : 'ends')}:{' '}
        {new Date(target).toLocaleTimeString(
          localStorage.getItem('i18nextLng') || 'en',
        )}
      </Typography>
      <Typography variant="h6">
        {display.str.replace('days', t('days')).replace('day', t('day'))}
      </Typography>
    </Grid>
  ) : null
}

const GymFooter = ({ gym, popups, setPopups, hasRaid, perms, Icons }) => {
  const classes = useStyles()
  const { lat, lon } = gym

  const handleExpandClick = (category) => {
    setPopups({
      ...popups,
      [category]: !popups[category],
    })
  }

  return (
    <>
      {hasRaid && perms.raids && perms.gyms && (
        <Grid item xs={4}>
          <IconButton
            className={classes.expand}
            onClick={() => handleExpandClick('raids')}
            aria-expanded={popups.raids}
          >
            <img
              src={Icons.getMisc(popups.raids ? 'gyms' : 'raids')}
              alt={popups.raids ? 'gyms' : 'raids'}
              height={20}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid item xs={4} style={{ textAlign: 'center' }}>
        <Navigation lat={lat} lon={lon} />
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

const ExtraInfo = ({ gym, userSettings, t, ts }) => {
  const { last_modified_timestamp, updated, total_cp, guarding_pokemon_id } =
    gym
  const { gymValidDataLimit } = useStatic((state) => state.config)

  const extraMetaData = [
    {
      description: 'defender',
      data: t(`poke_${guarding_pokemon_id}`),
      check: guarding_pokemon_id && updated > gymValidDataLimit,
    },
    {
      description: 'total_cp',
      data: total_cp,
      check: total_cp && updated > gymValidDataLimit,
    },
    {
      description: 'last_seen',
      timer: <GenericTimer expireTime={updated} />,
      data: Utility.dayCheck(ts, updated),
      check: updated,
    },
    {
      description: 'last_modified',
      timer: <GenericTimer expireTime={last_modified_timestamp} />,
      data: Utility.dayCheck(ts, last_modified_timestamp),
      check: last_modified_timestamp,
    },
  ].filter((x) => Boolean(x.check))

  return (
    <Grid container>
      {extraMetaData.map((meta) => (
        <Fragment key={meta.description}>
          <Grid
            item
            xs={t('popup_gym_description_width')}
            style={{ textAlign: 'left' }}
          >
            <Typography variant="caption">{t(meta.description)}:</Typography>
          </Grid>
          {Boolean(meta.timer) && (
            <Grid
              item
              xs={t('popup_gym_seen_timer_width')}
              style={{ textAlign: 'right' }}
            >
              {meta.timer}
            </Grid>
          )}
          <Grid
            item
            xs={
              meta.timer
                ? t('popup_gym_data_width')
                : t('popup_gym_seen_timer_width')
            }
            style={{ textAlign: 'right' }}
          >
            <Typography variant="caption">{meta.data}</Typography>
          </Grid>
        </Fragment>
      ))}
      {userSettings.enableGymPopupCoords && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Coords lat={gym.lat} lon={gym.lon} />
        </Grid>
      )}
    </Grid>
  )
}
