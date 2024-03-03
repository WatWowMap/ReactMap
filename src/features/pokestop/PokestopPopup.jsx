// @ts-check
import * as React from 'react'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import styled from '@mui/material/styles/styled'
import { useTranslation, Trans } from 'react-i18next'

import ErrorBoundary from '@components/ErrorBoundary'
import { Check, Help } from '@components/Icons'
import { useMemory } from '@hooks/useMemory'
import { setDeepStore, useStorage } from '@hooks/useStorage'
import Utility from '@services/Utility'
import { getBadge } from '@utils/getBadge'
import getRewardInfo from '@utils/getRewardInfo'
import { getGruntReward } from '@utils/getGruntReward'
import Dropdown from '@components/popups/Dropdown'
import TimeTile from '@components/popups/TimeTile'
import Navigation from '@components/popups/Navigation'
import Coords from '@components/popups/Coords'
import Title from '@components/popups/Title'
import HeaderImage from '@components/popups/HeaderImage'
import Timer from '@components/popups/Timer'
import PowerUp from '@components/popups/PowerUp'
import NameTT from '@components/popups/NameTT'
import { TimeStamp } from '@components/popups/TimeStamps'

/**
 *
 * @param {import('@rm/types').Pokestop & {
 *   hasLure: boolean
 *   hasInvasion: boolean
 *   hasQuest: boolean
 *   hasEvent: boolean
 * }} props
 * @returns
 */
export function PokestopPopup({
  hasLure,
  hasInvasion,
  hasQuest,
  hasEvent,
  ...pokestop
}) {
  const { t } = useTranslation()
  const Icons = useMemory((state) => state.Icons)
  const { lure_expire_timestamp, lure_id, invasions, events } = pokestop

  React.useEffect(() => {
    const has = { hasLure, hasQuest, hasInvasion }
    Utility.analytics(
      'Popup',
      Object.keys(has)
        .filter((a) => Boolean(has[a]))
        .join(','),
      'Pokestop',
    )
  }, [])

  const plainPokestop = !hasLure && !hasQuest && !hasInvasion && !hasEvent

  return (
    <ErrorBoundary noRefresh variant="h5">
      <Grid
        container
        direction="row"
        justifyContent="space-evenly"
        alignItems="center"
        width={200}
      >
        {!plainPokestop && (
          <Grid item xs={3} style={{ textAlign: 'center' }}>
            <HeaderImage
              alt={pokestop.name}
              url={pokestop.url}
              arScanEligible={pokestop.ar_scan_eligible}
            />
          </Grid>
        )}
        <Grid item xs={plainPokestop ? 10 : 7}>
          <Title backup={t('unknown_pokestop')}>{pokestop.name}</Title>
        </Grid>
        <MenuActions
          hasInvasion={hasInvasion}
          hasQuest={hasQuest}
          hasLure={hasLure}
          {...pokestop}
        />
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          {plainPokestop ? (
            <>
              <HeaderImage
                alt={pokestop.name}
                url={pokestop.url}
                arScanEligible={pokestop.ar_scan_eligible}
                large
              />
              <PowerUp {...pokestop} />
            </>
          ) : (
            <Grid container justifyContent="center" alignItems="center">
              <PowerUp
                {...pokestop}
                divider={hasInvasion || hasQuest || hasLure}
              />
              {hasQuest &&
                // eslint-disable-next-line no-unused-vars
                pokestop.quests.map(({ key, ...quest }, index) => (
                  <React.Fragment key={`${quest.with_ar}`}>
                    {index ? (
                      <Divider light flexItem className="popup-divider" />
                    ) : null}
                    <RewardInfo {...quest} />
                    <QuestConditions {...quest} />
                  </React.Fragment>
                ))}
              {hasLure && (
                <>
                  {hasQuest && (
                    <Divider light flexItem className="popup-divider" />
                  )}
                  <TimeTile
                    expandKey={`l${lure_id}`}
                    expireTime={lure_expire_timestamp}
                    icon={Icons.getPokestops(lure_id)}
                    until
                    caption={t(`lure_${lure_id}`)}
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
                        <Divider light flexItem className="popup-divider" />
                      ) : null}
                      <TimeTile
                        expandKey={`i${invasion.grunt_type}`}
                        expireTime={invasion.incident_expire_timestamp}
                        icon={Icons.getInvasions(
                          invasion.grunt_type,
                          invasion.confirmed,
                        )}
                        disabled={pokestop.hasShowcase ? 'showcase_block' : ''}
                        until
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
                    <Divider light flexItem className="popup-divider" />
                  )}
                  {events.map(({ showcase_rankings, ...event }, index) => {
                    const { contest_entries = [], ...showcase } =
                      showcase_rankings || { contest_entries: [] }
                    return (
                      <React.Fragment
                        key={`${event.display_type}-${event.event_expire_timestamp}`}
                      >
                        {index ? (
                          <Divider light flexItem className="popup-divider" />
                        ) : null}
                        <TimeTile
                          expireTime={event.event_expire_timestamp}
                          expandKey={
                            event.display_type === 9
                              ? `event_${event.display_type}`
                              : undefined
                          }
                          disabled={
                            event.display_type !== 9 && pokestop.hasShowcase
                              ? 'showcase_block'
                              : ''
                          }
                          icon={
                            event.showcase_pokemon_id ? (
                              <NameTT
                                key={event.showcase_pokemon_id}
                                id={[`poke_${event.showcase_pokemon_id}`]}
                              >
                                <div className="invasion-reward">
                                  <img
                                    className="invasion-reward"
                                    alt="invasion reward"
                                    src={Icons.getPokemon(
                                      event.showcase_pokemon_id,
                                      event.showcase_pokemon_form_id,
                                    )}
                                  />
                                  <img
                                    className="invasion-reward-shadow"
                                    alt="shadow"
                                    src={Icons.getEventStops(
                                      event.display_type,
                                    )}
                                  />
                                </div>
                              </NameTT>
                            ) : event.showcase_pokemon_type_id ? (
                              <NameTT
                                key={event.showcase_pokemon_type_id}
                                id={[
                                  `poke_type_${event.showcase_pokemon_type_id}`,
                                ]}
                              >
                                <div className="invasion-reward">
                                  <img
                                    className="invasion-reward"
                                    alt="invasion reward"
                                    src={Icons.getTypes(
                                      event.showcase_pokemon_type_id,
                                    )}
                                  />
                                  <img
                                    className="invasion-reward-shadow"
                                    alt="shadow"
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
                          until
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
                              size="small"
                              className="table-invasion three-quarters-width"
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
}) => {
  const { t } = useTranslation()
  const masterfile = useMemory((state) => state.masterfile)
  const filters = useStorage((state) => state.filters)

  const [anchorEl, setAnchorEl] = React.useState(false)

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

  /** @param {string} key */
  const setState = (key) =>
    setDeepStore(`filters.pokestops.filter.${key}.enabled`, false)

  const excludeLure = () => {
    setAnchorEl(null)
    setState(`l${lure_id}`)
  }

  const excludeQuest = (i) => {
    setAnchorEl(null)
    setState(quests[i].key)
  }

  const excludeInvasion = (i) => {
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

  const options = [{ name: 'hide', action: handleHide }]

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
          const encounters = new Set()
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
    <Grid item xs={2} style={{ textAlign: 'right' }}>
      <IconButton aria-haspopup="true" onClick={handleClick} size="large">
        <MoreVert />
      </IconButton>
      <Dropdown
        anchorEl={anchorEl}
        handleClose={handleClose}
        options={options}
      />
    </Grid>
  )
}

/**
 *
 * @param {Omit<import('@rm/types').Quest, 'key'>} props
 * @returns
 */
const RewardInfo = ({ with_ar, ...quest }) => {
  const { t } = useTranslation()
  const { src, amount, tt } = getRewardInfo(quest)
  const questMessage = useMemory((s) => s.config.misc.questMessage)

  return (
    <Grid item xs={3} style={{ textAlign: 'center', position: 'relative' }}>
      <NameTT id={tt}>
        <img
          src={src}
          style={{ maxWidth: 35, maxHeight: 35 }}
          alt={typeof tt === 'string' ? tt : tt.join(' ')}
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
      <Typography variant="caption" className="ar-task" noWrap>
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
}) => {
  const { i18n, t } = useTranslation()
  const madQuestText = useStorage((s) => s.userSettings.pokestops.madQuestText)

  if (madQuestText && quest_task) {
    return (
      <Grid item xs={9} textAlign="center">
        <Typography variant="caption">{quest_task}</Typography>
      </Grid>
    )
  }

  if (quest_title && !quest_title.includes('geotarget')) {
    const normalized = `quest_title_${quest_title.toLowerCase()}`
    if (i18n.exists(normalized)) {
      return (
        <Grid item xs={9} textAlign="center">
          <Typography variant="caption">
            <Trans i18nKey={normalized}>{{ amount_0: quest_target }}</Trans>
          </Typography>
        </Grid>
      )
    }
  }

  const [type1, type2] = Utility.parseConditions(quest_conditions)
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
      item
      xs={9}
      style={{ textAlign: 'center', maxHeight: 150, overflow: 'auto' }}
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
const Footer = ({ lat, lon }) => {
  const open = useStorage((state) => !!state.popups.extras)

  return (
    <Grid
      container
      item
      xs={12}
      justifyContent="space-evenly"
      alignItems="center"
    >
      <Grid item xs={3}>
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid item xs={3} textAlign="center">
        <IconButton
          className={open ? 'expanded' : 'closed'}
          onClick={() =>
            useStorage.setState((prev) => ({
              popups: { ...prev.popups, extras: !open },
            }))
          }
          size="large"
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
const ExtraInfo = ({ last_modified_timestamp, updated, lat, lon }) => {
  const open = useStorage((state) => state.popups.extras)
  const enablePokestopPopupCoords = useStorage(
    (state) => state.userSettings.pokestops.enablePokestopPopupCoords,
  )

  return (
    <Collapse in={open} timeout="auto" unmountOnExit sx={{ width: '100%' }}>
      <Grid container alignItems="center" justifyContent="center">
        <TimeStamp time={updated}>last_seen</TimeStamp>
        <TimeStamp time={last_modified_timestamp}>last_modified</TimeStamp>
        {enablePokestopPopupCoords && (
          <Grid item xs={12} textAlign="center">
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
const ShadowPokemon = ({ id, form, gender, costumeId, shiny }) => {
  const Icons = useMemory((s) => s.Icons)
  const src = Icons.getPokemon(id, form, 0, gender, costumeId, 1, shiny)
  return (
    <NameTT
      key={`${id}_${form}`}
      id={[form ? `form_${form}` : '', `poke_${id}`]}
    >
      <div className="invasion-reward">
        <img className="invasion-reward" alt="invasion reward" src={src} />
        {!src.includes('_a1') && (
          <img
            className="invasion-reward-shadow"
            alt="shadow"
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
const Invasion = ({ grunt_type, confirmed, ...invasion }) => {
  const Icons = useMemory((s) => s.Icons)
  const { t } = useTranslation()
  const info = useMemory((state) => state.masterfile.invasions[grunt_type])

  return (
    <Grid container>
      <Grid item xs={9}>
        <Typography variant="h6" align="center">
          {t(`grunt_a_${grunt_type}`)}
        </Typography>
      </Grid>
      <Grid item xs={3} style={{ alignItems: 'center', display: 'flex' }}>
        {confirmed ? (
          <Check fontSize="medium" color="success" />
        ) : (
          <Help fontSize="medium" />
        )}
      </Grid>
      <Grid item xs={12}>
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
                        <ShadowPokemon id={id} form={form} />
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
}) => {
  const { t } = useTranslation()
  return (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {t(
            `context_category_${showcase_ranking_standard}`,
            t('unknown_event'),
          )}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        {children}
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" align="center">
          {t(`total_entries`, 'Total Entries')}:
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" align="center">
          {total_entries} / 200 {/* TODO: Read from GM */}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="subtitle2" align="center">
          {t(`last_updated`, 'Last Updated')}:
        </Typography>
      </Grid>
      <Grid item xs={6}>
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

const ShowcaseEntry = ({ rank, score, pokemon_id, form, costume, gender }) => {
  const Icons = useMemory((s) => s.Icons)
  return (
    <TableRow>
      <NoBorderCell>
        <img src={Icons.getMisc(getBadge(rank))} alt="rank" height={20} />
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
            src={Icons.getPokemon(pokemon_id, form, 0, gender, costume)}
            alt="rank"
            height={20}
          />
        </NoBorderCell>
      )}
    </TableRow>
  )
}
