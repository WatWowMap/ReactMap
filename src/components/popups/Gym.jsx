// @ts-check
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import {
  Grid,
  Typography,
  Collapse,
  IconButton,
  Divider,
  MenuItem,
  Menu,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useSyncData } from '@features/webhooks/hooks'
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'
import { setDeepStore, useStorage } from '@hooks/useStorage'
import useWebhook from '@hooks/useWebhook'
import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'
import { TextWithIcon } from '@components/general/Img'

import Title from './common/Title'
import PowerUp from './common/PowerUp'
import GenderIcon from './common/GenderIcon'
import Navigation from './common/Navigation'
import Coords from './common/Coords'
import { TimeStamp } from './common/TimeStamps'
import { ExtraInfo } from './common/ExtraInfo'

/**
 *
 * @param {{
 *  hasRaid: boolean
 *  hasHatched: boolean
 *  raidIconUrl: string
 * } & import('@rm/types').Gym} props
 * @returns
 */
export default function GymPopup({ hasRaid, hasHatched, raidIconUrl, ...gym }) {
  const { t } = useTranslation()
  const { perms } = useMemory((state) => state.auth)
  const popups = useStorage((state) => state.popups)
  const ts = Math.floor(Date.now() / 1000)

  React.useEffect(() => {
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
        direction="row"
        justifyContent="space-evenly"
        alignItems="center"
        width={200}
      >
        <Grid item xs={10}>
          <Title backup={t('unknown_gym')}>{gym.name}</Title>
        </Grid>
        <MenuActions hasRaid={hasRaid} {...gym} />
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
                <PoiImage {...gym} />
                <Divider orientation="vertical" flexItem />
                <GymInfo {...gym} />
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
                <RaidImage raidIconUrl={raidIconUrl} {...gym} />
                <Divider orientation="vertical" flexItem />
                {gym.raid_pokemon_id ? (
                  <RaidInfo {...gym} />
                ) : (
                  <Timer start {...gym} />
                )}
                {Boolean(
                  gym.raid_pokemon_id && gym.raid_battle_timestamp >= ts,
                ) && <Timer start {...gym} hasHatched={hasHatched} />}
                <Timer {...gym} hasHatched={hasHatched} />
              </Grid>
            </Collapse>
          </Grid>
        )}
        <PowerUp {...gym} />
        <GymFooter hasRaid={hasRaid} lat={gym.lat} lon={gym.lon} />
        {perms.gyms && (
          <Collapse in={popups.extras} timeout="auto" unmountOnExit>
            <ExtraGymInfo {...gym} />
          </Collapse>
        )}
      </Grid>
    </ErrorBoundary>
  )
}

/**
 *
 * @param {{
 *  hasRaid: boolean
 * } & import('@rm/types').Gym} param0
 * @returns
 */
const MenuActions = ({ hasRaid, ...gym }) => {
  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = React.useCallback(() => setAnchorEl(null), [])

  return (
    <Grid item xs={2} textAlign="right">
      <IconButton aria-haspopup="true" onClick={handleClick} size="large">
        <MoreVert />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        <DropdownOptions {...gym} hasRaid={hasRaid} handleClose={handleClose} />
      </Menu>
    </Grid>
  )
}

/**
 *
 * @param {{
 *  handleClose: () => void
 *  hasRaid: boolean
 * } & import('@rm/types').Gym} param0
 * @returns
 */
const DropdownOptions = ({
  id,
  badge,
  handleClose,
  updated,
  team_id,
  hasRaid,
  raid_pokemon_id,
  raid_pokemon_form,
  raid_level,
}) => {
  const { t } = useTranslation()

  const { gyms, raids, gymBadges, webhooks } = useMemory((s) => s.auth.perms)
  const gymValidDataLimit = useMemory((state) => state.gymValidDataLimit)

  const { data: raidHooks } = useSyncData('raid')
  const { data: gymHooks } = useSyncData('gym')
  const { data: eggHooks } = useSyncData('egg')

  const hasRaidHook = raidHooks?.find((x) => x.gym_id === id)
  const hasGymHook = gymHooks?.find((x) => x.gym_id === id)
  const hasEggHook = eggHooks?.find((x) => x.gym_id === id)
  const hasWebhook = !!(hasGymHook || hasRaidHook || hasEggHook)

  const addWebhook = useWebhook({ category: 'quickGym' })

  const handleHide = () => {
    handleClose()
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const handleExclude = (key) => {
    handleClose()
    setDeepStore(`filters.gyms.filter.${key}.enabled`, false)
  }

  const excludeTeam = () => handleExclude(`t${team_id}-0`)

  const excludeBoss = () =>
    handleExclude(
      raid_pokemon_id > 0
        ? `${raid_pokemon_id}-${raid_pokemon_form}`
        : `e${raid_level}`,
    )

  const handleTimer = () => {
    handleClose()
    useMemory.setState((prev) => {
      if (prev.timerList.includes(id)) {
        return { timerList: prev.timerList.filter((x) => x !== id) }
      }
      return { timerList: [...prev.timerList, id] }
    })
  }

  const options = [{ name: 'hide', action: handleHide }]

  if (gyms) {
    if (updated > gymValidDataLimit) {
      options.push({ name: 'exclude_team', action: excludeTeam })
    }
    if (gymBadges) {
      options.push({
        name: 'gym_badge_menu',
        action: () => {
          handleClose()
          return useLayoutStore.setState({
            gymBadge: { badge, gymId: id, open: true },
          })
        },
      })
    }
  }
  if (raids && hasRaid) {
    options.push(
      { name: 'exclude_raid', action: excludeBoss },
      { name: 'timer', action: handleTimer },
    )
  }

  if (webhooks?.length) {
    options.push({
      name: t(hasWebhook ? 'remove_webhook_entry' : 'webhook_entry', {
        name: t('alerts'),
      }),
      action: () => {
        if (hasWebhook) {
          if (hasGymHook) addWebhook(hasGymHook.uid, 'gym-delete')
          if (hasRaidHook) addWebhook(hasRaidHook.uid, 'raid-delete')
          if (hasEggHook) addWebhook(hasEggHook.uid, 'egg-delete')
        } else {
          addWebhook(id, 'quickGym')
        }
      },
      key: 'wehbhook',
    })
  }

  return options.filter(Boolean).map((option) => (
    <MenuItem key={option.key || option.name} onClick={option.action} dense>
      {typeof option.name === 'string' ? t(option.name) : option.name}
    </MenuItem>
  ))
}

/**
 *
 * @param {import('@rm/types').Gym} props
 * @returns
 */
const PoiImage = ({ url, team_id, name, badge }) => {
  const Icons = useMemory((state) => state.Icons)
  const src = url ? url.replace('http://', 'https://') : Icons.getTeams(team_id)

  return (
    <Grid item xs={6}>
      <img
        src={src}
        alt={name || 'unknown'}
        className={`${
          badge ? `badge badge-${badge}` : `circle-image team-${team_id}`
        }`}
        style={{
          maxHeight: 75,
          maxWidth: 75,
        }}
      />
    </Grid>
  )
}

/**
 *
 * @param {import('@rm/types').Gym & { raidIconUrl: string }} props
 * @returns
 */
const RaidImage = ({
  raidIconUrl,
  raid_level,
  raid_pokemon_id,
  raid_pokemon_form,
  raid_pokemon_gender,
}) => {
  const { t } = useTranslation()
  const Icons = useMemory((state) => state.Icons)
  const pokemon = useMemory((state) => state.masterfile.pokemon)

  /**
   *
   * @param {number} id
   * @param {number} form
   * @returns
   */
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
          src={raidIconUrl}
          alt={raidIconUrl}
          style={{
            maxHeight: 50,
            maxWidth: 50,
          }}
        />
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="caption">
          {t(`raid_${raid_level}`)} ({raid_level})
        </Typography>
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

/**
 *
 * @param {import('@rm/types').Gym} props
 * @returns
 */
const GymInfo = ({
  team_id,
  available_slots,
  ex_raid_eligible,
  ar_scan_eligible,
  updated,
  badge,
}) => {
  const { t } = useTranslation()
  const Icons = useMemory((state) => state.Icons)
  const gymValidDataLimit = useMemory((state) => state.gymValidDataLimit)

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
          height: 24,
          backgroundImage: `url(${Icons.getTeams(team_id)})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    </Grid>
  )
}

/**
 * @param {import('@rm/types').Gym} props
 */
const RaidInfo = ({
  raid_level,
  raid_pokemon_id,
  raid_pokemon_form,
  raid_pokemon_costume,
  raid_pokemon_move_1,
  raid_pokemon_move_2,
}) => {
  const { t } = useTranslation()
  const Icons = useMemory((state) => state.Icons)

  const moves = useMemory((state) => state.masterfile.moves)

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
      const raidForm = t(`form_${form}`)
      if (raidForm === t('form_29') || !raidForm) {
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

/**
 *
 * @param {{
 *  start?: boolean
 *  hasHatched?: boolean
 *  raid_battle_timestamp: number
 *  raid_end_timestamp: number
 *  raid_pokemon_id: number
 * }} param0
 * @returns
 */
const Timer = ({
  start,
  hasHatched,
  raid_battle_timestamp,
  raid_end_timestamp,
  raid_pokemon_id,
}) => {
  const { t } = useTranslation()

  const target = (start ? raid_battle_timestamp : raid_end_timestamp) * 1000
  const update = () =>
    start || hasHatched || raid_pokemon_id
      ? Utility.getTimeUntil(target, true)
      : Utility.formatInterval(target - raid_battle_timestamp * 1000)

  const [display, setDisplay] = React.useState(update)

  React.useEffect(() => {
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  return target ? (
    <Grid
      item
      xs={start && !raid_pokemon_id ? 6 : 12}
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

/**
 *
 * @param {{
 *   lat: number
 *   lon: number
 *   hasRaid: boolean
 * }} param0
 * @returns
 */
const GymFooter = ({ lat, lon, hasRaid }) => {
  const darkMode = useStorage((s) => s.darkMode)
  const popups = useStorage((state) => state.popups)
  const perms = useMemory((state) => state.auth.perms)

  const handleExpandClick = (category) => {
    useStorage.setState((prev) => ({
      popups: {
        ...prev.popups,
        [category]: !popups[category],
      },
    }))
  }

  return (
    <>
      {hasRaid && perms.raids && perms.gyms && (
        <Grid item xs={4}>
          <IconButton onClick={() => handleExpandClick('raids')} size="large">
            <img
              src={useMemory
                .getState()
                .Icons.getMisc(popups.raids ? 'gyms' : 'raids')}
              alt={popups.raids ? 'gyms' : 'raids'}
              className={darkMode ? '' : 'darken-image'}
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
            className={popups.extras ? 'expanded' : 'closed'}
            onClick={() => handleExpandClick('extras')}
            size="large"
          >
            <ExpandMore />
          </IconButton>
        </Grid>
      )}
    </>
  )
}

/**
 *
 * @param {import('@rm/types').Gym} props
 * @returns
 */
const ExtraGymInfo = ({
  last_modified_timestamp,
  lat,
  lon,
  updated,
  total_cp,
  guarding_pokemon_id,
}) => {
  const { t, i18n } = useTranslation()
  const Icons = useMemory((s) => s.Icons)
  const gymValidDataLimit = useMemory((state) => state.gymValidDataLimit)
  const enableGymPopupCoords = useStorage(
    (state) => state.userSettings.gyms.enableGymPopupCoords,
  )

  const numFormatter = new Intl.NumberFormat(i18n.language)

  return (
    <Grid container alignItems="center" justifyContent="center">
      {!!guarding_pokemon_id && updated > gymValidDataLimit && (
        <ExtraInfo title="defender">
          <TextWithIcon src={Icons.getPokemon(guarding_pokemon_id)}>
            {t(`poke_${guarding_pokemon_id}`)}
          </TextWithIcon>
        </ExtraInfo>
      )}
      {!!total_cp && updated > gymValidDataLimit && (
        <ExtraInfo title="total_cp">{numFormatter.format(total_cp)}</ExtraInfo>
      )}
      <Divider
        flexItem
        style={{ width: '100%', height: 2, margin: '10px 0' }}
      />
      <TimeStamp time={updated}>last_seen</TimeStamp>
      <TimeStamp time={last_modified_timestamp}>last_modified</TimeStamp>
      {enableGymPopupCoords && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Coords lat={lat} lon={lon} />
        </Grid>
      )}
    </Grid>
  )
}
