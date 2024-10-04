import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import styled from '@mui/material/styles/styled'
import Check from '@mui/icons-material/Check'
import Help from '@mui/icons-material/Help'
import { useTranslation, Trans } from 'react-i18next'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { useMemory } from '@store/useMemory'
import { setDeepStore, useStorage } from '@store/useStorage'
import { getBadge } from '@utils/getBadge'
import { getRewardInfo } from '@utils/getRewardInfo'
import { getGruntReward } from '@utils/getGruntReward'
import { Dropdown } from '@components/popups/Dropdown'
import { TimeTile } from '@components/popups/TimeTile'
import { Navigation } from '@components/popups/Navigation'
import { Coords } from '@components/popups/Coords'
import { Title } from '@components/popups/Title'
import { HeaderImage } from '@components/popups/HeaderImage'
import { Timer } from '@components/popups/Timer'
import { PowerUp } from '@components/popups/PowerUp'
import { NameTT } from '@components/popups/NameTT'
import { TimeStamp } from '@components/popups/TimeStamps'
import { useAnalytics } from '@hooks/useAnalytics'
import { parseQuestConditions } from '@utils/parseConditions'
import { Img } from '@components/Img'

export function PokestopPopup({
  hasLure,
  hasInvasion,
  hasQuest,
  hasEvent,
  ...pokestop
}: import('@rm/types').Pokestop & {
  hasLure: boolean
  hasInvasion: boolean
  hasQuest: boolean
  hasEvent: boolean
}) {
  const { t } = useTranslation()
  const Icons = useMemory((s) => s.Icons)
  const { lure_expire_timestamp, lure_id, invasions, events } = pokestop

  useAnalytics(
    'Popup',
    Object.entries({ hasLure, hasQuest, hasInvasion })
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(','),
    'Pokestop',
  )

  const plainPokestop = !hasLure && !hasQuest && !hasInvasion && !hasEvent

  return (
    <ErrorBoundary noRefresh variant="h5">
      <Grid
        container
        alignItems="center"
        direction="row"
        justifyContent="space-evenly"
        width={200}
      >
        {!plainPokestop && (
          <Grid textAlign="center" xs={3}>
            <HeaderImage
              alt={pokestop.name}
              arScanEligible={pokestop.ar_scan_eligible}
              url={pokestop.url}
            />
          </Grid>
        )}
        <Grid xs={plainPokestop ? 10 : 7}>
          <Title backup={t('unknown_pokestop')}>{pokestop.name}</Title>
        </Grid>
        <MenuActions
          hasInvasion={hasInvasion}
          hasLure={hasLure}
          hasQuest={hasQuest}
          {...pokestop}
        />
        <Grid textAlign="center" xs={12}>
          {plainPokestop ? (
            <>
              <HeaderImage
                large
                alt={pokestop.name}
                arScanEligible={pokestop.ar_scan_eligible}
                url={pokestop.url}
              />
              <PowerUp {...pokestop} />
            </>
          ) : (
            <Grid container alignItems="center" justifyContent="center">
              <PowerUp
                {...pokestop}
                divider={hasInvasion || hasQuest || hasLure}
              />
              {hasQuest &&
                // eslint-disable-next-line no-unused-vars
                pokestop.quests.map(({ key, ...quest }, index) => (
                  <React.Fragment key={`${key}${quest.with_ar}`}>
                    {index ? (
                      <Divider flexItem light className="popup-divider" />
                    ) : null}
                    <RewardInfo {...quest} />
                    <QuestConditions {...quest} />
                  </React.Fragment>
                ))}
              {hasLure && (
                <>
                  {hasQuest && (
                    <Divider flexItem light className="popup-divider" />
                  )}
                  <TimeTile
                    caption={t(`lure_${lure_id}`)}
                    expandKey={`l${lure_id}`}
                    expireTime={lure_expire_timestamp}
                    icon={Icons.getPokestops(lure_id)}
                    tt={`lure_${lure_id}`}
                  />
                </>
              )}
              {hasInvasion && (
                <>
                  {invasions.map((invasion, index) => (
                    <React.Fragment
                      key={`${invasion.grunt_type}-${invasion.incident_expire_timestamp}`}
                    >
                      {index || hasQuest || hasLure ? (
                        <Divider flexItem light className="popup-divider" />
                      ) : null}
                      <TimeTile
                        disabled={pokestop.hasShowcase ? 'showcase_block' : ''}
                        expandKey={`i${invasion.grunt_type}`}
                        expireTime={invasion.incident_expire_timestamp}
                        icon={Icons.getInvasions(
                          invasion.grunt_type,
                          invasion.confirmed,
                        )}
                        tt={
                          invasion.grunt_type === 44 && !invasion.confirmed
                            ? [`grunt_a_${invasion.grunt_type}`, ' / ', 'decoy']
                            : `grunt_a_${invasion.grunt_type}`
                        }
                      >
                        <Invasion {...invasion} />
                      </TimeTile>
                    </React.Fragment>
                  ))}
                </>
              )}
              {hasEvent && (
                <>
                  {(hasQuest || hasLure || hasInvasion) && (
                    <Divider flexItem light className="popup-divider" />
                  )}
                  {events.map(({ showcase_rankings, ...event }, index) => {
                    const { contest_entries = [], ...showcase } =
                      showcase_rankings || { contest_entries: [] }

                    return (
                      <React.Fragment
                        key={`${event.display_type}-${event.event_expire_timestamp}`}
                      >
                        {index ? (
                          <Divider flexItem light className="popup-divider" />
                        ) : null}
                        <TimeTile
                          disabled={
                            event.display_type !== 9 && pokestop.hasShowcase
                              ? 'showcase_block'
                              : ''
                          }
                          expandKey={
                            event.display_type === 9
                              ? `event_${event.display_type}`
                              : undefined
                          }
                          expireTime={event.event_expire_timestamp}
                          icon={
                            event.showcase_pokemon_id ? (
                              <NameTT
                                key={event.showcase_pokemon_id}
                                title={[`poke_${event.showcase_pokemon_id}`]}
                              >
                                <div className="invasion-reward">
                                  <img
                                    alt="invasion reward"
                                    className="invasion-reward"
                                    src={Icons.getPokemon(
                                      event.showcase_pokemon_id,
                                      event.showcase_pokemon_form_id,
                                    )}
                                  />
                                  <img
                                    alt="shadow"
                                    className="invasion-reward-shadow"
                                    src={Icons.getEventStops(
                                      event.display_type,
                                    )}
                                  />
                                </div>
                              </NameTT>
                            ) : event.showcase_pokemon_type_id ? (
                              <NameTT
                                key={event.showcase_pokemon_type_id}
                                title={[
                                  `poke_type_${event.showcase_pokemon_type_id}`,
                                ]}
                              >
                                <div className="invasion-reward">
                                  <img
                                    alt="invasion reward"
                                    className="invasion-reward"
                                    src={Icons.getTypes(
                                      event.showcase_pokemon_type_id,
                                    )}
                                  />
                                  <img
                                    alt="shadow"
                                    className="invasion-reward-shadow"
                                    src={Icons.getEventStops(
                                      event.display_type,
                                    )}
                                  />
                                </div>
                              </NameTT>
                            ) : (
                              Icons.getEventStops(event.display_type)
                            )
                          }
                          tt={t(
                            `display_type_${event.display_type}`,
                            t('unknown_event'),
                          )}
                        >
                          <Showcase
                            {...showcase}
                            showcase_ranking_standard={
                              event.showcase_ranking_standard
                            }
                          >
                            <Table
                              className="table-invasion three-quarters-width"
                              size="small"
                            >
                              <TableBody>
                                {(contest_entries || []).map((position) => (
                                  <ShowcaseEntry
                                    key={position.rank}
                                    {...position}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </Showcase>
                        </TimeTile>
                      </React.Fragment>
                    )
                  })}
                </>
              )}
            </Grid>
          )}
        </Grid>
        <Footer lat={pokestop.lat} lon={pokestop.lon} />
        <ExtraInfo {...pokestop} />
      </Grid>
    </ErrorBoundary>
  )
}

/**
 *
 * @param {import('@rm/types').Pokestop & {
 *  hasLure: boolean
 *  hasInvasion: boolean
 *  hasQuest: boolean
 * }} param0
 * @returns
 */
const MenuActions = ({
  hasInvasion,
  hasQuest,
  hasLure,
  id,
  lure_id,
  quests,
  invasions,
}: import('@rm/types').Pokestop & {
  hasLure: boolean
  hasInvasion: boolean
  hasQuest: boolean
}) => {
  const { t } = useTranslation()
  const masterfile = useMemory((s) => s.masterfile)
  const filters = useStorage((s) => s.filters)

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => ({ hideList: new Set(prev.hideList).add(id) }))
  }

  const setState = (key: string) =>
    setDeepStore(`filters.pokestops.filter.${key}.enabled`, false)

  const excludeLure = () => {
    setAnchorEl(null)
    setState(`l${lure_id}`)
  }

  const excludeQuest = (i: number) => {
    setAnchorEl(null)
    setState(quests[i].key)
  }

  const excludeInvasion = (i: number) => {
    setAnchorEl(null)
    setState(`i${invasions[i].grunt_type}`)
  }

  const handleTimer = () => {
    setAnchorEl(null)
    useMemory.setState((prev) => {
      if (prev.timerList.includes(id)) {
        return { timerList: prev.timerList.filter((x) => x !== id) }
      }

      return { timerList: [...prev.timerList, id] }
    })
  }

  const options: { name: string; action: () => void; key?: string }[] = [
    { name: 'hide', action: handleHide },
  ]

  if (hasQuest) {
    quests.forEach((quest, i) => {
      let reward = ''

      switch (quest.quest_reward_type) {
        case 2:
          reward = t(`item_${quest.quest_item_id}`)
          break
        case 3:
          reward = `${t('stardust')} x${quest.stardust_amount}`
          break
        case 4:
          reward = `${t(`poke_${quest.candy_pokemon_id}`)} ${t('candy')}`
          break
        case 7:
          reward = t(`poke_${quest.quest_pokemon_id}`)
          break
        case 9:
          reward = `${t(`poke_${quest.xl_candy_pokemon_id}`)} ${t('xl')}`
          break
        case 12:
          reward = `${t(`poke_${quest.mega_pokemon_id}`)} x${quest.mega_amount}`
          break
        default:
          reward = t(`quest_reward_${quest.quest_reward_type}`)
          break
      }
      options.push({
        key: `${reward}-${quest.with_ar}`,
        name: t('exclude_quest_multi', { reward }),
        action: () => excludeQuest(i),
      })
    })
  }

  if (hasInvasion || hasLure) {
    if (hasInvasion) {
      invasions.forEach((invasion, i) => {
        if (filters.pokestops.filter[`i${invasion.grunt_type}`]?.enabled) {
          options.push({
            key: `${invasion.grunt_type}-${invasion.incident_expire_timestamp}`,
            name: t('exclude_invasion_multi', {
              invasion: t(`grunt_a_${invasion.grunt_type}`),
            }),
            action: () => excludeInvasion(i),
          })
        }
        const reference = masterfile.invasions[invasion.grunt_type]

        if (reference) {
          const encounters = new Set<string>()

          if (
            invasion.slot_1_pokemon_id &&
            reference.firstReward &&
            filters.pokestops.filter[
              `a${invasion.slot_1_pokemon_id}-${invasion.slot_1_form}`
            ]?.enabled
          ) {
            encounters.add(
              `a${invasion.slot_1_pokemon_id}-${invasion.slot_1_form}`,
            )
          }
          if (
            invasion.slot_2_pokemon_id &&
            reference.secondReward &&
            filters.pokestops.filter[
              `a${invasion.slot_2_pokemon_id}-${invasion.slot_2_form}`
            ]?.enabled
          ) {
            encounters.add(
              `a${invasion.slot_2_pokemon_id}-${invasion.slot_2_form}`,
            )
          }
          if (
            invasion.slot_3_pokemon_id &&
            reference.thirdReward &&
            filters.pokestops.filter[
              `a${invasion.slot_3_pokemon_id}-${invasion.slot_3_form}`
            ]?.enabled
          ) {
            encounters.add(
              `a${invasion.slot_3_pokemon_id}-${invasion.slot_3_form}`,
            )
          }
          if (encounters.size)
            options.push(
              ...[...encounters].map((x) => ({
                key: x,
                name: t('exclude_quest_multi', {
                  reward: t(`poke_${x.slice(1).split('-')[0]}`),
                }),
                action: () => {
                  setAnchorEl(null)
                  setState(x)
                },
              })),
            )
        }
      })
    }
    if (hasLure) {
      options.push({ name: 'exclude_lure', action: excludeLure })
    }
    options.push({ name: 'timer', action: handleTimer })
  }

  return (
    <Grid textAlign="right" xs={2}>
      <IconButton aria-haspopup="true" size="large" onClick={handleClick}>
        <MoreVert />
      </IconButton>
      <Dropdown anchorEl={anchorEl} options={options} onClose={handleClose} />
    </Grid>
  )
}

/**
 *
 * @param {Omit<import('@rm/types').Quest, 'key'>} props
 * @returns
 */
const RewardInfo = ({
  with_ar,
  ...quest
}: Omit<import('@rm/types').Quest, 'key'>) => {
  const { t } = useTranslation()
  const { src, amount, tt } = getRewardInfo(quest)
  const questMessage = useMemory((s) => s.config.misc.questMessage)

  return (
    <Grid style={{ textAlign: 'center', position: 'relative' }} xs={3}>
      <NameTT title={tt}>
        <img
          alt={typeof tt === 'string' ? tt : tt.join(' ')}
          src={src}
          style={{ maxWidth: 35, maxHeight: 35 }}
          onError={(e) => {
            // @ts-ignore
            e.target.onerror = null
            // @ts-ignore
            e.target.src =
              'https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/misc/0.webp'
          }}
        />
      </NameTT>
      {!!amount && (
        <div
          className="search-amount-holder"
          style={{ fontSize: 'medium', bottom: 20 }}
        >
          x{amount}
        </div>
      )}
      <Typography noWrap className="ar-task" variant="caption">
        {questMessage || t(`ar_quest_${!!with_ar}`)}
      </Typography>
    </Grid>
  )
}

/**
 *
 * @param {Omit<import('@rm/types').Quest, 'key'>} props
 * @returns
 */
const QuestConditions = ({
  quest_task,
  quest_type,
  quest_target,
  quest_conditions,
  quest_title,
}: Omit<import('@rm/types').Quest, 'key'>) => {
  const { i18n, t } = useTranslation()
  const madQuestText = useStorage((s) => s.userSettings.pokestops.madQuestText)

  if (madQuestText && quest_task) {
    return (
      <Grid textAlign="center" xs={9}>
        <Typography variant="caption">{quest_task}</Typography>
      </Grid>
    )
  }

  if (quest_title && !quest_title.includes('geotarget')) {
    const normalized = `quest_title_${quest_title.toLowerCase()}`

    if (i18n.exists(normalized)) {
      return (
        <Grid textAlign="center" xs={9}>
          <Typography variant="caption">
            <Trans i18nKey={normalized}>{{ amount_0: quest_target }}</Trans>
          </Typography>
        </Grid>
      )
    }
  }

  const [type1, type2] = parseQuestConditions(quest_conditions)
  const primaryCondition = (
    <Typography variant="caption">
      <Trans i18nKey={`quest_${quest_type}`}>{{ amount: quest_target }}</Trans>
    </Typography>
  )
  const getQuestConditions = (qType, qInfo) => {
    const key = `quest_condition_${qType}_formatted`

    switch (qType) {
      case 1:
        return (
          <Trans i18nKey={key}>
            {{
              types: qInfo.pokemon_type_ids.map((id) => t(`poke_type_${id}`)),
            }}
          </Trans>
        )
      case 2:
        return (
          <Trans i18nKey={key}>
            {{ pokemon: qInfo.pokemon_ids.map((id) => ` ${t(`poke_${id}`)}`) }}
          </Trans>
        )
      case 7:
        return (
          <Trans i18nKey={key}>
            {{ levels: qInfo.raid_levels.map((id) => id) }}
          </Trans>
        )
      case 11:
        return (
          <Trans i18nKey={key}>{{ item: t(`item_${qInfo.item_id}`) }}</Trans>
        )
      case 8:
      case 14:
        return qInfo.throw_type_id ? (
          <Trans i18nKey={key}>
            {{ throw_type: t(`throw_type_${qInfo.throw_type_id}`) }}
          </Trans>
        ) : (
          t('quest_condition_14')
        )
      case 26:
        return (
          <Trans i18nKey={key}>
            {{
              alignments: qInfo.alignment_ids.map((id) => t(`alignment_${id}`)),
            }}
          </Trans>
        )
      case 27:
        return (
          <Trans i18nKey={key}>
            {{
              categories: qInfo.character_category_ids.map((id) =>
                t(`character_category_${id}`),
              ),
            }}
          </Trans>
        )
      case 44:
        return <Trans i18nKey={key}>{{ time: qInfo.time }}</Trans>
      default:
        return t(`quest_condition_${qType}`)
    }
  }

  return (
    <Grid
      style={{ textAlign: 'center', maxHeight: 150, overflow: 'auto' }}
      xs={9}
    >
      {primaryCondition}
      {type1 && (
        <>
          <br />
          <Typography variant="caption">
            {getQuestConditions(type1.type, type1.info)}
          </Typography>
        </>
      )}
      {type2 && (
        <>
          <br />
          <Typography variant="caption">
            {getQuestConditions(type2.type, type2.info)}
          </Typography>
        </>
      )}
    </Grid>
  )
}

/**
 *
 * @param {Pick<import('@rm/types').Pokestop, 'lat' | 'lon'>} props
 * @returns
 */
const Footer = ({
  lat,
  lon,
}: Pick<import('@rm/types').Pokestop, 'lat' | 'lon'>) => {
  const open = useStorage((s) => !!s.popups.extras)

  return (
    <Grid container alignItems="center" justifyContent="space-evenly" xs={12}>
      <Grid xs={3}>
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid textAlign="center" xs={3}>
        <IconButton
          className={open ? 'expanded' : 'closed'}
          size="large"
          onClick={() =>
            useStorage.setState((prev) => ({
              popups: { ...prev.popups, extras: !open },
            }))
          }
        >
          <ExpandMore />
        </IconButton>
      </Grid>
    </Grid>
  )
}

/**
 *
 * @param {import('@rm/types').Pokestop} props
 * @returns
 */
const ExtraInfo = ({
  last_modified_timestamp,
  updated,
  lat,
  lon,
}: import('@rm/types').Pokestop) => {
  const open = useStorage((s) => s.popups.extras)
  const enablePokestopPopupCoords = useStorage(
    (s) => s.userSettings.pokestops.enablePokestopPopupCoords,
  )

  return (
    <Collapse unmountOnExit in={open} sx={{ width: '100%' }} timeout="auto">
      <Grid container alignItems="center" justifyContent="center">
        <TimeStamp time={updated}>last_seen</TimeStamp>
        <TimeStamp time={last_modified_timestamp}>last_modified</TimeStamp>
        {enablePokestopPopupCoords && (
          <Grid textAlign="center" xs={12}>
            <Coords lat={lat} lon={lon} />
          </Grid>
        )}
      </Grid>
    </Collapse>
  )
}

/**
 *
 * @param {{ id: number, form: number, gender?: number, costumeId?: number, shiny?: boolean}} param0
 * @returns
 */
const ShadowPokemon = ({
  id,
  form,
  gender,
  costumeId,
  shiny,
}: {
  id: number
  form: number
  gender?: number
  costumeId?: number
  shiny?: boolean
}) => {
  const Icons = useMemory((s) => s.Icons)
  const src = Icons.getPokemon(id, form, 0, gender, costumeId, 1, shiny)

  return (
    <NameTT
      key={`${id}_${form}`}
      title={[form ? `form_${form}` : '', `poke_${id}`]}
    >
      <div className="invasion-reward">
        <img alt="invasion reward" className="invasion-reward" src={src} />
        {!src.includes('_a1') && (
          <img
            alt="shadow"
            className="invasion-reward-shadow"
            src={Icons.getMisc('shadow')}
          />
        )}
      </div>
    </NameTT>
  )
}

const ENCOUNTER_NUM = { first: '#1', second: '#2', third: '#3' }

/**
 *
 * @param {import('@rm/types').Invasion} props
 * @returns
 */
const Invasion = ({
  grunt_type,
  confirmed,
  ...invasion
}: import('@rm/types').Invasion) => {
  const Icons = useMemory((s) => s.Icons)
  const { t } = useTranslation()
  const info = useMemory((s) => s.masterfile.invasions[grunt_type])

  return (
    <Grid container>
      <Grid xs={9}>
        <Typography align="center" variant="h6">
          {t(`grunt_a_${grunt_type}`)}
        </Typography>
      </Grid>
      <Grid style={{ alignItems: 'center', display: 'flex' }} xs={3}>
        {confirmed ? (
          <Check color="success" fontSize="medium" />
        ) : (
          <Help fontSize="medium" />
        )}
      </Grid>
      <Grid xs={12}>
        <table className="table-invasion">
          <tbody>
            {Object.entries(info?.encounters || {}).map(
              ([position, lineup], i) => {
                const id = invasion[`slot_${i + 1}_pokemon_id`]
                const form = invasion[`slot_${i + 1}_form`]
                const reward = getGruntReward(info)[position]

                return (
                  <tr key={position}>
                    <td>{ENCOUNTER_NUM[position]}</td>
                    <td>
                      {id ? (
                        <ShadowPokemon form={form} id={id} />
                      ) : (
                        lineup.map((data) => (
                          <ShadowPokemon
                            key={`${data.id}-${data.form}`}
                            Icons={Icons}
                            {...data}
                          />
                        ))
                      )}
                    </td>
                    <td>{reward ? `${reward}%` : ''}</td>
                  </tr>
                )
              },
            )}
          </tbody>
        </table>
      </Grid>
    </Grid>
  )
}

/**
 *
 * @param {{
 *   last_update?: number
 *   total_entries?: number
 *   showcase_ranking_standard: number
 *   children: React.ReactNode
 * }} param0
 * @returns
 */
const Showcase = ({
  showcase_ranking_standard,
  total_entries,
  last_update,
  children,
}: {
  last_update?: number
  total_entries?: number
  showcase_ranking_standard: number
  children: React.ReactNode
}) => {
  const { t } = useTranslation()

  return (
    <Grid container>
      <Grid xs={12}>
        <Typography align="center" variant="h6">
          {t(
            `context_category_${showcase_ranking_standard}`,
            t('unknown_event'),
          )}
        </Typography>
      </Grid>
      <Grid xs={12}>{children}</Grid>
      <Grid xs={6}>
        <Typography align="center" variant="subtitle2">
          {t(`total_entries`, 'Total Entries')}:
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography align="center" variant="subtitle2">
          {total_entries} / 200 {/* TODO: Read from GM */}
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Typography align="center" variant="subtitle2">
          {t(`last_updated`, 'Last Updated')}:
        </Typography>
      </Grid>
      <Grid xs={6}>
        <Timer expireTime={last_update} />
      </Grid>
    </Grid>
  )
}

const NoBorderCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== 'textAlign',
  // @ts-ignore
})(({ textAlign = 'right' }) => ({
  borderBottom: 'none',
  padding: 2,
  textAlign,
}))

const ShowcaseEntry = (entry) => {
  const { rank, score, pokemon_id, badge } = entry
  const Icons = useMemory((s) => s.Icons)
  const { t } = useTranslation()

  return (
    <TableRow>
      <NoBorderCell>
        <img alt="rank" height={20} src={Icons.getMisc(getBadge(rank))} />
      </NoBorderCell>
      <NoBorderCell
        // @ts-ignore
        textAlign="center"
      >
        {score.toFixed(2)}
      </NoBorderCell>
      {pokemon_id && (
        <NoBorderCell>
          <img
            alt="rank"
            height={20}
            src={Icons.getPokemonByDisplay(pokemon_id, entry)}
          />
          {badge === 1 && (
            <Img
              alt={t('best_buddy')}
              maxHeight={15}
              maxWidth={15}
              src={Icons.getMisc('bestbuddy')}
            />
          )}
        </NoBorderCell>
      )}
    </TableRow>
  )
}
