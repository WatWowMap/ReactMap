// @ts-check
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ShieldIcon from '@mui/icons-material/Shield'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { useTranslation } from 'react-i18next'

import { useSyncData } from '@features/webhooks'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { setDeepStore, useStorage } from '@store/useStorage'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { Img } from '@components/Img'
import { Title } from '@components/popups/Title'
import { PowerUp } from '@components/popups/PowerUp'
import { GenderIcon } from '@components/popups/GenderIcon'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { TimeStamp } from '@components/popups/TimeStamps'
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
  const [showDefenders, setShowDefenders] = React.useState(false)

  useAnalytics('Popup', `Team ID: ${gym.team_id} Has Raid: ${hasRaid}`, 'Gym')

  // If defenders modal is toggled, show only that
  if (showDefenders) {
    return (
      <ErrorBoundary noRefresh style={{}} variant="h5">
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          width={200}
        >
          <DefendersModal gym={gym} onClose={() => setShowDefenders(false)} />
        </Grid>
      </ErrorBoundary>
    )
  }

  const formatTime = (timestamp) => {
    const locale = localStorage.getItem('i18nextLng') || 'en'
    return new Date(timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const raidStart = Number(gym.raid_spawn_timestamp ?? 0)
  const raidEnd = Number(gym.raid_end_timestamp ?? 0)

  const filteredRsvps =
    gym.rsvps?.filter((entry) => {
      const etsSec = entry.timeslot / 1000
      return etsSec >= nowSec && etsSec >= raidStart && etsSec <= raidEnd
    }) || []

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
                {filteredRsvps.length > 0 && (
                  <Grid xs={12}>
                    <Grid
                      container
                      direction="column"
                      alignItems="center"
                      style={{ margin: '2px 0' }}
                    >
                      <small
                        style={{
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          marginBottom: 4,
                        }}
                      >
                        <Typography variant="subtitle1">RSVP</Typography>
                      </small>
                      <Grid container justifyContent="center" spacing={1}>
                        {filteredRsvps.slice(0, 3).map((entry) => (
                          <Grid
                            key={entry.timeslot}
                            xs="auto"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              borderRadius: '6px',
                              paddingTop: '4px',
                              fontSize: '0.80rem',
                              minWidth: 50,
                              textAlign: 'center',
                            }}
                          >
                            <div>{formatTime(entry.timeslot)}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                              {entry.going_count} / {entry.maybe_count}
                            </div>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                <Timer {...gym} hasHatched={hasHatched} />
              </Grid>
            </Collapse>
          </Grid>
        )}
        <PowerUp {...gym} />
        <GymFooter
          hasRaid={hasRaid}
          lat={gym.lat}
          lon={gym.lon}
          gym={gym}
          setShowDefenders={setShowDefenders}
        />
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
 * Compact modal for gym defenders
 * @param {{ gym: import('@rm/types').Gym, onClose: () => void }} param0
 */
function DefendersModal({ gym, onClose }) {
  const { t } = useTranslation()
  const Icons = useMemory((s) => s.Icons)
  const defenders = gym.defenders || []

  return (
    <Grid
      container
      direction="column"
      alignItems="stretch"
      mt={-1}
      style={{ minWidth: 250, maxWidth: 350, padding: 8 }}
    >
      <Grid container alignItems="center" mb={1}>
        <Grid xs={2}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            size="small"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        </Grid>
        <Grid
          xs={10}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
            maxWidth: 200,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Title backup={t('unknown_gym')}>{gym.name}</Title>
        </Grid>
      </Grid>
      <Grid container direction="column" spacing={1}>
        {defenders.map((def) => {
          const fullCP = def.cp_when_deployed
          const currentCP = def.cp_now
          const percent = Math.max(0, Math.min(1, currentCP / fullCP))

          return (
            <div
              key={def.pokemon_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 60,
                width: '100%',
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                  marginRight: 6,
                  flexShrink: 0,
                }}
              >
                <Img
                  src={Icons.getPokemonByDisplay(def.pokemon_id, def)}
                  alt={t(`poke_${def.pokemon_id}`)}
                  style={{
                    maxHeight: 44,
                    maxWidth: 44,
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  minWidth: 0,
                  textAlign: 'left',
                  overflow: 'hidden',
                  marginLeft: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                  title={t(`poke_${def.pokemon_id}`)}
                >
                  {t(`poke_${def.pokemon_id}`)}
                </span>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {t('cp')}: <b>{currentCP}</b> / {fullCP}
                </span>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'right',
                  marginLeft: 6,
                  marginRight: 12,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {/* Heart outline */}
                <FavoriteIcon
                  style={{
                    color: 'transparent',
                    position: 'absolute',
                    width: 28,
                    height: 28,
                    stroke: 'white',
                    strokeWidth: 1,
                    filter: 'drop-shadow(0 0 1px #0008)',
                  }}
                  className="heart-outline"
                />
                {/* Heart background */}
                <FavoriteIcon
                  style={{
                    color: 'white',
                    opacity: 0.18,
                    position: 'absolute',
                    width: 28,
                    height: 28,
                  }}
                />
                {/* Heart fill */}
                <FavoriteIcon
                  style={{
                    color: '#ff69b4',
                    position: 'absolute',
                    width: 28,
                    height: 28,
                    clipPath: `inset(${100 - percent * 100}% 0 0 0)`,
                    transition: 'clip-path 0.3s',
                  }}
                />
                {/* Heart cracks for rounds */}
                <svg
                  width={28}
                  height={28}
                  viewBox="0 0 28 28"
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Show cracks based on health: */}
                  {percent <= 2 / 3 && (
                    // Always show top crack if percent <= 2/3
                    <path
                      d="M2,9 Q7,11 14,9 Q21,11 26,9"
                      stroke="white"
                      strokeWidth={1.5}
                      fill="none"
                      strokeLinejoin="round"
                    />
                  )}
                  {percent <= 1 / 3 && (
                    // Show bottom crack only if percent <= 1/3
                    <path
                      d="M7,19 Q11,17 14,19 Q17,17 21,19"
                      stroke="white"
                      strokeWidth={1.5}
                      fill="none"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
            </div>
          )
        })}
      </Grid>
      <Grid
        xs={12}
        textAlign="center"
        mt={1}
        mb={-1}
        style={{ fontSize: 12, color: '#888' }}
      >
        {t('last_updated')}:{' '}
        {gym.updated
          ? new Date(gym.updated * 1000).toLocaleString()
          : t('unknown')}
      </Grid>
    </Grid>
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
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      xs={6}
      spacing={0.5}
    >
      <Grid>
        <Typography variant="h6" align="center" noWrap>
          {getRaidName(raid_level, raid_pokemon_id)}
        </Typography>
      </Grid>

      <Grid>
        <Typography variant="caption" align="center" sx={{ pb: 0.5 }} noWrap>
          {getRaidForm(
            raid_pokemon_id,
            raid_pokemon_form,
            raid_pokemon_costume,
          )}
        </Typography>
      </Grid>

      {/* Move 1 */}
      {raid_pokemon_move_1 && raid_pokemon_move_1 !== 1 && (
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          sx={{ maxWidth: '100%', flexWrap: 'nowrap' }}
          spacing={1}
        >
          <Grid>
            <Box
              sx={{
                width: 15,
                height: 15,
                backgroundImage: `url(${Icons.getTypes(
                  moves[raid_pokemon_move_1].type,
                )})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
              }}
            />
          </Grid>
          <Grid sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              noWrap
              sx={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
            >
              {t(`move_${raid_pokemon_move_1}`)}
            </Typography>
          </Grid>
        </Grid>
      )}

      {/* Move 2 */}
      {raid_pokemon_move_2 && raid_pokemon_move_2 !== 2 && (
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          sx={{ maxWidth: '100%', flexWrap: 'nowrap' }}
          spacing={1}
        >
          <Grid>
            <Box
              sx={{
                width: 15,
                height: 15,
                backgroundImage: `url(${Icons.getTypes(
                  moves[raid_pokemon_move_2].type,
                )})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
              }}
            />
          </Grid>
          <Grid sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              noWrap
              sx={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
            >
              {t(`move_${raid_pokemon_move_2}`)}
            </Typography>
          </Grid>
        </Grid>
      )}
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
 *   gym: any
 *   setShowDefenders: any
 * }} param0
 * @returns
 */
const GymFooter = ({ lat, lon, hasRaid, gym, setShowDefenders }) => {
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

  const buttons = []

  if (hasRaid && perms.raids && perms.gyms) {
    buttons.push({
      key: 'raids',
      element: (
        <IconButton onClick={() => handleExpandClick('raids')} size="large">
          <img
            src={useMemory
              .getState()
              .Icons.getMisc(popups.raids ? 'gyms' : 'raids')}
            alt={popups.raids ? 'gyms' : 'raids'}
            className={darkMode ? '' : 'darken-image'}
            height={24}
            width={24}
            style={{ objectFit: 'contain' }}
          />
        </IconButton>
      ),
    })
  }

  if (gym.defenders?.length > 0) {
    buttons.push({
      key: 'defenders',
      element: (
        <IconButton
          onClick={(e) => {
            e.stopPropagation()
            setShowDefenders(true)
          }}
          size="large"
        >
          <ShieldIcon />
        </IconButton>
      ),
    })
  }

  buttons.push({
    key: 'nav',
    element: <Navigation lat={lat} lon={lon} />,
  })

  if (perms.gyms) {
    buttons.push({
      key: 'extras',
      element: (
        <IconButton
          className={popups.extras ? 'expanded' : 'closed'}
          onClick={() => handleExpandClick('extras')}
          size="large"
        >
          <ExpandMore />
        </IconButton>
      ),
    })
  }

  return (
    <Grid
      sx={{
        display: 'flex',
        overflow: 'hidden',
        mt: 1,
      }}
    >
      {buttons.map(({ key, element }) => (
        <Grid key={key}>{element}</Grid>
      ))}
    </Grid>
  )
}

/**
 *
 * @param {import('@rm/types').Gym} props
 * @returns
 */
const ExtraGymInfo = ({ last_modified_timestamp, lat, lon, updated }) => {
  const enableGymPopupCoords = useStorage(
    (s) => s.userSettings.gyms.enableGymPopupCoords,
  )

  return (
    <Grid container alignItems="center" justifyContent="center">
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
