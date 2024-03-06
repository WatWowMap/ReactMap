// @ts-check
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useSyncData } from '@features/webhooks'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { setDeepStore, useStorage } from '@store/useStorage'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { Img, TextWithIcon } from '@components/Img'
import { Title } from '@components/popups/Title'
import { PowerUp } from '@components/popups/PowerUp'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'
import { ExtraInfo } from '@components/popups/ExtraInfo'
import { useAnalytics } from '@hooks/useAnalytics'
import { getTimeUntil } from '@utils/getTimeUntil'
import { formatInterval } from '@utils/formatInterval'

import { useWebhook } from './useWebhook'

/**
 *
 * @param {{
 *  hasRaid: boolean
 *  hasHatched: boolean
 *  raidIconUrl: string
 * } & import('@rm/types').Gym} props
 * @returns
 */
export function GymPopup({ hasRaid, hasHatched, raidIconUrl, ...gym }) {
  const { t } = useTranslation()
  const { perms } = useMemory((s) => s.auth)
  const popups = useStorage((s) => s.popups)
  const ts = Math.floor(Date.now() / 1000)

  useAnalytics('Popup', `Team ID: ${gym.team_id} Has Raid: ${hasRaid}`, 'Gym')

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        direction="row"
        justifyContent="space-evenly"
        alignItems="center"
        width={200}
      >
        <Grid xs={10}>
          <Title backup={t('unknown_gym')}>{gym.name}</Title>
        </Grid>
        <MenuActions hasRaid={hasRaid} {...gym} />
        {perms.gyms && (
          <Grid xs={12}>
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
          <Grid xs={12}>
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
    <Grid xs={2} textAlign="right">
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
  const gymValidDataLimit = useMemory((s) => s.gymValidDataLimit)

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
  const Icons = useMemory((s) => s.Icons)
  const src = url ? url.replace('http://', 'https://') : Icons.getTeams(team_id)

  return (
    <Grid xs={6}>
      <Img
        src={src}
        alt={name || 'unknown'}
        className={`${
          badge ? `badge badge-${badge}` : `circle-image team-${team_id}`
        }`}
        maxHeight={75}
        maxWidth={75}
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
  const Icons = useMemory((s) => s.Icons)
  const pokemon = useMemory((s) => s.masterfile.pokemon)

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
    <Grid container xs={5} justifyContent="center" alignItems="center">
      <Grid xs={12} textAlign="center">
        <Img src={raidIconUrl} alt={raidIconUrl} maxHeight={50} maxWidth={50} />
      </Grid>
      <Grid xs={12} textAlign="center">
        <Typography variant="caption">
          {t(`raid_${raid_level}`)} ({raid_level})
        </Typography>
      </Grid>
      {raid_pokemon_id > 0 &&
        getRaidTypes(raid_pokemon_id, raid_pokemon_form).map((type) => (
          <Grid
            key={type}
            xs={4}
            className="grid-item"
            height={15}
            width={15}
            style={{ backgroundImage: `url(${Icons.getTypes(type)})` }}
          />
        ))}
      {!!raid_pokemon_gender && (
        <Grid xs={4} textAlign="center">
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
  const Icons = useMemory((s) => s.Icons)
  const gymValidDataLimit = useMemory((s) => s.gymValidDataLimit)

  return (
    <Grid
      xs={5}
      container
      direction="row"
      justifyContent="space-around"
      alignItems="center"
    >
      {!!badge && (
        <Grid xs={12}>
          <Typography variant="h6" align="center" className={`badge_${badge}`}>
            {t(`badge_${badge}`)}
          </Typography>
        </Grid>
      )}
      {updated > gymValidDataLimit && (
          <Grid xs={12}>
            <Typography variant="h6" align="center">
              {t(`team_${team_id}`)}
            </Typography>
          </Grid>
        ) && (
          <Grid xs={12}>
            <Typography variant="h6" align="center">
              {available_slots} {t('slots')}
            </Typography>
          </Grid>
        )}
      {ex_raid_eligible && (
        <Grid
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
  const Icons = useMemory((s) => s.Icons)

  const moves = useMemory((s) => s.masterfile.moves)

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
    <Grid xs={6} container justifyContent="space-around" alignItems="center">
      <Grid xs={12}>
        <Typography variant="h6" align="center">
          {getRaidName(raid_level, raid_pokemon_id)}
        </Typography>
      </Grid>
      <Grid xs={12} style={{ paddingBottom: 4, textAlign: 'center' }}>
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
      <Grid xs={10} textAlign="center">
        <Typography variant="caption" align="center">
          {t(`move_${raid_pokemon_move_1}`)}
        </Typography>
      </Grid>
      {raid_pokemon_move_2 && raid_pokemon_move_2 !== 2 && (
        <Grid
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
      <Grid xs={10} textAlign="center">
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
      ? getTimeUntil(target, true)
      : formatInterval(target - raid_battle_timestamp * 1000)

  const [display, setDisplay] = React.useState(update)

  React.useEffect(() => {
    const timer = setTimeout(() => setDisplay(update()), 1000)
    return () => clearTimeout(timer)
  })

  return target ? (
    <Grid xs={start && !raid_pokemon_id ? 6 : 12} textAlign="center">
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
  const popups = useStorage((s) => s.popups)
  const perms = useMemory((s) => s.auth.perms)

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
        <Grid xs={4}>
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
      <Grid xs={4} textAlign="center">
        <Navigation lat={lat} lon={lon} />
      </Grid>
      {perms.gyms && (
        <Grid xs={4}>
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
  const gymValidDataLimit = useMemory((s) => s.gymValidDataLimit)
  const enableGymPopupCoords = useStorage(
    (s) => s.userSettings.gyms.enableGymPopupCoords,
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
        <Grid xs={12} textAlign="center">
          <Coords lat={lat} lon={lon} />
        </Grid>
      )}
    </Grid>
  )
}
