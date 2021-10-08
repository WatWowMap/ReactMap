/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Collapse, IconButton, Divider,
} from '@material-ui/core'
import { ExpandMore, MoreVert } from '@material-ui/icons'
import { useTranslation, Trans } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Utility from '@services/Utility'
import Dropdown from './common/Dropdown'
import TimeTile from './common/TimeTile'
import Navigation from './common/Navigation'
import Title from './common/Title'
import HeaderImage from './common/HeaderImage'
import Timer from './common/Timer'

export default function PokestopPopup({
  pokestop, ts, hasLure, hasInvasion, hasQuest, Icons, userSettings, config,
}) {
  const { t } = useTranslation()
  const { pokestops: perms } = useStatic(state => state.ui)
  const popups = useStore(state => state.popups)
  const setPopups = useStore(state => state.setPopups)
  const {
    lure_expire_timestamp, lure_id, invasions,
  } = pokestop

  useEffect(() => {
    const has = { hasLure, hasQuest, hasInvasion }
    Utility.analytics('Popup', Object.keys(has).filter(a => Boolean(has[a])), 'Pokestop')
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
      <Grid item xs={3} style={{ textAlign: 'center' }}>
        <HeaderImage
          Icons={Icons}
          alt={pokestop.name}
          url={pokestop.url}
          backup={Icons.getPokestops(0)}
          arScanEligible={pokestop.ar_scan_eligible}
        />
      </Grid>
      <Grid item xs={7}>
        <Title
          mainName={pokestop.name}
          backup={t('unknownPokestop')}
        />
      </Grid>
      <Grid item xs={2}>
        <MenuActions
          pokestop={pokestop}
          perms={perms}
          hasInvasion={hasInvasion}
          hasQuest={hasQuest}
          hasLure={hasLure}
          t={t}
          ts={ts}
        />
      </Grid>
      <Grid item xs={12}>
        <Collapse in={!popups.invasions || !hasInvasion} timeout="auto" unmountOnExit>
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            spacing={1}
          >
            {hasQuest && pokestop.quests.map((quest, index) => (
              <Fragment key={quest.with_ar}>
                {index ? <Divider light flexItem className="popup-divider" /> : null}
                <RewardInfo
                  quest={quest}
                  Icons={Icons}
                  config={config}
                  t={t}
                />
                <QuestConditions
                  quest={quest}
                  t={t}
                  userSettings={userSettings}
                />
              </Fragment>
            ))}
            {hasLure && (
              <>
                {(hasQuest) && <Divider light flexItem className="popup-divider" />}
                <TimeTile
                  expireTime={lure_expire_timestamp}
                  icon={Icons.getPokestops(lure_id)}
                  until
                />
              </>
            )}
            {hasInvasion && (
              <>
                {(hasQuest || hasLure) && <Divider light flexItem className="popup-divider" />}
                {invasions.map(invasion => (
                  <TimeTile
                    key={`${invasion.grunt_type}-${invasion.incident_expire_timestamp}`}
                    expireTime={invasion.incident_expire_timestamp}
                    icon={Icons.getInvasions(invasion.grunt_type)}
                    until
                  />
                ))}
              </>
            )}
          </Grid>
        </Collapse>
      </Grid>
      {(perms.invasions && hasInvasion) && (
        <Collapse in={popups.invasions} timeout="auto" unmountOnExit>
          <Invasion pokestop={pokestop} Icons={Icons} t={t} />
        </Collapse>
      )}
      <Footer
        pokestop={pokestop}
        popups={popups}
        setPopups={setPopups}
        hasInvasion={hasInvasion}
        perms={perms}
        Icons={Icons}
      />
      {perms.allPokestops && (
        <Collapse in={popups.extras} timeout="auto" unmountOnExit>
          <ExtraInfo pokestop={pokestop} t={t} ts={ts} />
        </Collapse>
      )}
    </Grid>
  )
}

const MenuActions = ({
  pokestop, perms, hasInvasion, hasQuest, hasLure, t,
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

  const {
    id, lure_id, quests, invasions,
  } = pokestop

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

  const setState = (key) => {
    setFilters({
      ...filters,
      pokestops: {
        ...filters.pokestops,
        filter: {
          ...filters.pokestops.filter,
          [key]: {
            ...filters.pokestops.filter[key],
            enabled: false,
          },
        },
      },
    })
    setExcludeList([...excludeList, key])
  }

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
    if (timerList.includes(id)) {
      setTimerList(timerList.filter(x => x !== id))
    } else {
      setTimerList([...timerList, id])
    }
  }

  const options = [
    { name: 'hide', action: handleHide },
  ]

  if (perms.lures && hasLure) {
    options.push({ name: 'excludeLure', action: excludeLure })
  }

  if (perms.quests && hasQuest) {
    quests.forEach((quest, i) => {
      let reward = ''
      switch (quest.quest_reward_type) {
        case 2: reward = t(`item_${quest.quest_item_id}`); break
        case 3: reward = `${t('stardust')} x${quest.stardust_amount}`; break
        case 4: reward = `${t(`poke_${quest.candy_pokemon_id} ${t('candy')}`)}`; break
        case 7: reward = t(`poke_${quest.quest_pokemon_id}`); break
        case 12: reward = `${t(`poke_${quest.mega_pokemon_id}`)} x${quest.mega_amount}`; break
        default: reward = t(`quest_reward_${quest.quest_reward_type}`); break
      }
      options.push({
        key: `${reward}-${quest.with_ar}`,
        name: <Trans i18nKey="excludeQuestMulti">{{ reward }}</Trans>,
        action: () => excludeQuest(i),
      })
    })
  }
  if ((perms.invasions && hasInvasion)
    || (perms.lures && hasLure)) {
    invasions.forEach((invasion, i) => {
      options.push({
        key: `${invasion.grunt_type}-${invasion.incident_expire_timestamp}`,
        name: <Trans i18nKey="excludeInvasionMulti">{{ invasion: t(`grunt_a_${invasion.grunt_type}`) }}</Trans>,
        action: () => excludeInvasion(i),
      })
    })
    options.push(
      { name: 'timer', action: handleTimer },
    )
  }
  return (
    <Grid item xs={3} style={{ textAlign: 'right' }}>
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

const RewardInfo = ({
  quest, Icons, config, t,
}) => {
  const {
    quest_item_id,
    item_amount,
    stardust_amount,
    candy_pokemon_id,
    candy_amount,
    mega_pokemon_id,
    mega_amount,
    quest_reward_type,
    quest_pokemon_id,
    quest_form_id,
    quest_gender_id,
    quest_costume_id,
    quest_shiny,
    with_ar,
  } = quest

  const getImage = () => {
    switch (quest_reward_type) {
      case 2: return Icons.getRewards(quest_reward_type, quest_item_id, item_amount)
      case 3: return Icons.getRewards(quest_reward_type, stardust_amount)
      case 4: return Icons.getRewards(quest_reward_type, candy_pokemon_id, candy_amount)
      case 7: return Icons.getPokemon(
        quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny,
      )
      case 12: return Icons.getRewards(quest_reward_type, mega_pokemon_id, mega_amount)
      default: return Icons.getRewards(quest_reward_type)
    }
  }

  return (
    <Grid item xs={3} style={{ textAlign: 'center' }}>
      <img src={getImage()} className="quest-popup-img" />
      <Typography variant="caption" className="ar-task" noWrap>
        {config.questMessage ? config.questMessage : t(`arQuest_${Boolean(with_ar)}`)}
      </Typography>
    </Grid>
  )
}

const QuestConditions = ({ quest, t, userSettings }) => {
  const {
    quest_task,
    quest_type,
    quest_target,
    quest_conditions,
  } = quest

  if (userSettings.madQuestText && quest_task) {
    return (
      <Grid item xs={9} style={{ textAlign: 'center' }}>
        <Typography variant="caption">
          {quest_task}
        </Typography>
      </Grid>
    )
  }
  const [type1, type2] = Utility.parseConditions(quest_conditions)
  const primaryCondition = (
    <Typography variant="caption">
      <Trans i18nKey={`quest_${quest_type}`}>
        {{ amount: quest_target }}
      </Trans>
    </Typography>
  )
  const getQuestConditions = (qType, qInfo) => {
    switch (qType) {
      case 1: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ types: qInfo.pokemon_type_ids.map(id => t(`poke_type_${id}`)) }}
        </Trans>
      )
      case 2: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ pokemon: qInfo.pokemon_ids.map(id => t(`poke_${id}`)) }}
        </Trans>
      )
      case 7: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ levels: qInfo.raid_levels.map(id => id) }}
        </Trans>
      )
      case 11: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ item: t(`item_${qInfo.item_id}`) }}
        </Trans>
      )
      case 8:
      case 14: return qInfo.throw_type_id ? (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ throw_type: t(`throw_type_${qInfo.throw_type_id}`) }}
        </Trans>
      ) : t('quest_condition_14')
      case 26: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ alignments: qInfo.alignment_ids.map(id => t(`alignment_${id}`)) }}
        </Trans>
      )
      case 27: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ categories: qInfo.character_category_ids.map(id => t(`character_category_${id}`)) }}
        </Trans>
      )
      default: return t(`quest_condition_${qType}`)
    }
  }
  return (
    <Grid item xs={9} style={{ textAlign: 'center' }}>
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

const Footer = ({
  pokestop, popups, setPopups,
  hasInvasion, perms, Icons,
}) => {
  const classes = useStyles()

  const handleExpandClick = (category) => {
    setPopups({
      ...popups, [category]: !popups[category],
    })
  }

  return (
    <Grid container item xs={12} justifyContent="space-evenly" alignItems="center">
      {(hasInvasion && perms.invasions) && (
        <Grid item xs={3} style={{ textAlign: 'center' }}>
          <IconButton
            className={classes.expand}
            onClick={() => handleExpandClick('invasions')}
            aria-expanded={popups.invasions}
          >
            <img
              src={Icons.getMisc(popups.invasions ? 'quest' : 'invasion')}
              className="circle pulse"
            />
          </IconButton>
        </Grid>
      )}
      <Grid item xs={3}>
        <Navigation lat={pokestop.lat} lon={pokestop.lon} />
      </Grid>
      {perms.allPokestops && (
        <Grid item xs={3} style={{ textAlign: 'center' }}>
          <IconButton
            className={popups.extras ? classes.expandOpen : classes.expand}
            onClick={() => handleExpandClick('extras')}
            aria-expanded={popups.extras}
          >
            <ExpandMore style={{ color: 'white' }} />
          </IconButton>
        </Grid>
      )}
    </Grid>
  )
}

const ExtraInfo = ({ pokestop, t, ts }) => {
  const { last_modified_timestamp, updated } = pokestop

  const extraMetaData = [
    {
      description: 'lastSeen',
      timer: <Timer expireTime={updated} />,
      data: Utility.dayCheck(ts, updated),
    },
    {
      description: 'lastModified',
      timer: <Timer expireTime={last_modified_timestamp} />,
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
          <Grid item xs={t('popupPokestopSeenDescriptionWidth')} style={{ textAlign: 'left' }}>
            <Typography variant="caption">
              {t(meta.description)}:
            </Typography>
          </Grid>
          <Grid item xs={t('popupPokestopSeenTimerWidth')} style={{ textAlign: 'right' }}>
            {meta.timer}
          </Grid>
          <Grid item xs={t('popupPokestopSeenDataWidth')} style={{ textAlign: 'right' }}>
            <Typography variant="caption">
              {meta.data}
            </Typography>
          </Grid>
        </Fragment>
      ))}
    </Grid>
  )
}

const Invasion = ({ pokestop, Icons, t }) => {
  const { invasions } = pokestop
  const { invasions: invasionInfo } = useStatic(state => state.masterfile)
  const encounterNum = { first: '#1', second: '#2', third: '#3' }

  const makeShadowPokemon = pkmn => (
    <div key={pkmn.id} className="invasion-reward">
      <img
        className="invasion-reward"
        src={Icons.getPokemon(pkmn.id, pkmn.form, 0, pkmn.gender, pkmn.costumeId, pkmn.shiny)}
      />
      <img
        className="invasion-reward-shadow"
        src={Icons.getMisc('shadow')}
      />
    </div>
  )

  const getRewardPercent = grunt => {
    if (grunt.type === 'Giovanni') {
      return { third: '100%' }
    }
    if (grunt.type.startsWith('NPC')) {
      return {}
    }
    if (grunt.second_reward) {
      return { first: '85%', second: '15%' }
    }
    return { first: '100%' }
  }

  return invasions.map(invasion => (
    <Grid container key={`${invasion.grunt_type}-${invasion.incident_expire_timestamp}`}>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {t(`grunt_a_${invasion.grunt_type}`)}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <table className="table-invasion">
          <tbody>
            {Object.keys(invasionInfo[invasion.grunt_type].encounters).map(position => (
              <tr key={position}>
                <td>{encounterNum[position]}</td>
                <td>
                  {invasionInfo[invasion.grunt_type].encounters[position].map(data => makeShadowPokemon(data))}
                </td>
                <td>{getRewardPercent(invasionInfo[invasion.grunt_type])[position] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Grid>
    </Grid>
  ))
}
