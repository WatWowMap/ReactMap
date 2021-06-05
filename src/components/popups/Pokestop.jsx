/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem,
} from '@material-ui/core'
import { ExpandMore, Map, MoreVert } from '@material-ui/icons'
import { useTranslation, Trans } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Utility from '@services/Utility'

export default function PokestopPopup({
  pokestop, ts, hasLure, hasInvasion, hasQuest, path, availableForms,
}) {
  const { t } = useTranslation()
  const { pokestops: perms } = useStatic(state => state.ui)
  const [invasionExpand, setInvasionExpand] = useState(false)
  const [extraExpand, setExtraExpand] = useState(false)
  const {
    incident_expire_timestamp, lure_expire_timestamp, lure_id, grunt_type,
  } = pokestop

  return (
    <Grid
      container
      style={{ minWidth: 250, maxWidth: 300 }}
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Header
        pokestop={pokestop}
        perms={perms}
        hasInvasion={hasInvasion}
        hasQuest={hasQuest}
        hasLure={hasLure}
        t={t}
        ts={ts}
      />
      <Grid item xs={12}>
        <Collapse in={!invasionExpand} timeout="auto" unmountOnExit>
          <Grid
            container
            alignItems="center"
            justify="space-evenly"
            spacing={1}
          >
            <PoiImage
              pokestop={pokestop}
              ts={ts}
              hasQuest={hasQuest}
              hasLure={hasLure}
              hasInvasion={hasInvasion}
              t={t}
            />
            {hasQuest ? (
              <>
                <Divider orientation="vertical" flexItem />
                <Grid
                  item
                  xs={6}
                  container
                  direction="row"
                  justify="center"
                  alignItems="center"
                >
                  <QuestConditions
                    pokestop={pokestop}
                    t={t}
                  />
                  <RewardInfo
                    pokestop={pokestop}
                    path={path}
                    availableForms={availableForms}
                    t={t}
                  />
                </Grid>
              </>
            ) : (
              <>
                {(hasLure || hasInvasion)
                  && <Divider orientation="vertical" flexItem />}
                <Grid container item xs={6}>
                  {hasLure && (
                    <Timer
                      expireTime={lure_expire_timestamp}
                      name={`lure_${lure_id}`}
                      t={t}
                    />
                  )}
                  {hasInvasion && (
                    <Timer
                      expireTime={incident_expire_timestamp}
                      name={grunt_type}
                      grunt
                      t={t}
                    />
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </Collapse>
      </Grid>
      {perms.invasions && (
        <Grid item xs={12}>
          <Collapse in={invasionExpand} timeout="auto" unmountOnExit>
            <Invasion pokestop={pokestop} path={path} availableForms={availableForms} t={t} />
          </Collapse>
        </Grid>
      )}
      <Footer
        pokestop={pokestop}
        expanded={extraExpand}
        setExpanded={setExtraExpand}
        invasionExpand={invasionExpand}
        setInvasionExpand={setInvasionExpand}
        hasInvasion={hasInvasion}
        perms={perms}
      />
      {perms.allPokestops && (
        <Collapse in={extraExpand} timeout="auto" unmountOnExit>
          <ExtraInfo pokestop={pokestop} t={t} ts={ts} />
        </Collapse>
      )}
    </Grid>
  )
}

const Header = ({
  pokestop, perms, hasInvasion, hasQuest, t, hasLure,
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
  const [pokestopName, setPokestopName] = useState(true)
  const open = Boolean(anchorEl)
  const {
    id, grunt_type, quest_pokemon_id, quest_form_id, mega_pokemon_id,
    quest_reward_type, stardust_amount, quest_item_id, mega_amount,
  } = pokestop
  const name = pokestop.name || t('unknownPokestop')

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

  const excludeQuest = () => {
    setAnchorEl(null)
    let key = ''
    switch (quest_reward_type) {
      default: key = `${quest_pokemon_id}-${quest_form_id}`; break
      case 2: key = `q${quest_item_id}`; break
      case 3: key = `d${stardust_amount}`; break
      case 12: key = `m${mega_pokemon_id}-${mega_amount}`; break
    }
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

  const excludeInvasion = () => {
    setAnchorEl(null)
    const key = `i${grunt_type}`
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

  const handleTimer = () => {
    setAnchorEl(null)
    setTimerList([...timerList, id])
  }

  const options = [
    { name: 'hide', action: handleHide },
  ]

  if (perms.quests && hasQuest) {
    options.push({ name: 'excludeQuest', action: excludeQuest })
  }
  if ((perms.invasions && hasInvasion)
    || (perms.lures && hasLure)) {
    options.push(
      { name: 'excludeInvasion', action: excludeInvasion },
      { name: 'timer', action: handleTimer },
    )
  }

  return (
    <>
      <Grid item xs={9}>
        <Typography
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          align="center"
          noWrap={pokestopName}
          onClick={() => setPokestopName(!pokestopName)}
        >
          {name}
        </Typography>
      </Grid>
      <Grid item xs={3} style={{ textAlign: 'right' }}>
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
            {t(option.name)}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const PoiImage = ({
  pokestop, ts, hasQuest, hasLure, hasInvasion, t,
}) => {
  const {
    name, url, lure_id, lure_expire_timestamp, incident_expire_timestamp, ar_scan_eligible,
  } = pokestop

  const lureName = lure_expire_timestamp > ts ? `lure_${lure_id}` : ''
  const src = url
    ? url.replace('http://', 'https://')
    : '/images/misc/pokestop.png'

  const invasionColor = hasInvasion ? 'invasion-exists' : ''

  const getImageSize = () => {
    if (hasQuest) {
      if (hasInvasion || hasLure) {
        return 60
      }
    }
    return 90
  }
  return (
    <Grid
      container
      item
      xs={(hasQuest || hasInvasion || hasLure) ? 5 : 11}
      justify="center"
      alignItems="center"
    >
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <div className="ar-eligible">
          <img
            src={src}
            alt={name || 'unknown'}
            className={`circle-image ${lureName} ${invasionColor}`}
            style={{
              maxHeight: getImageSize(),
              maxWidth: getImageSize(),
            }}
          />
          {ar_scan_eligible === 1 && (
          <img
            className="ar-logo"
            src="/images/misc/ar.png"
          />
          )}
        </div>
      </Grid>
      {(hasLure && hasQuest)
        && (
          <Timer
            name={lureName}
            expireTime={lure_expire_timestamp}
            t={t}
          />
        )}
      {(hasInvasion && hasQuest)
        && (
          <Timer
            expireTime={incident_expire_timestamp}
            t={t}
          />
        )}
    </Grid>
  )
}

const Timer = ({
  expireTime, name, t, grunt,
}) => {
  const { invasions: { [name]: invasion } } = useStatic(state => state.masterfile)
  const endTime = new Date(expireTime * 1000)
  const [timerEnd, setTimerEnd] = useState(Utility.getTimeUntil(endTime, true))

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerEnd(Utility.getTimeUntil(endTime, true))
    }, 1000)
    return () => clearTimeout(timer)
  })

  return (
    <>
      {name && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="subtitle2">
            {grunt ? t(invasion.type) : t(name)}
          </Typography>
        </Grid>
      )}
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2">
          {timerEnd.str}
        </Typography>
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="caption">
          {new Date(endTime).toLocaleTimeString(localStorage.getItem('i18nextLng'))}
        </Typography>
      </Grid>
    </>
  )
}

const RewardInfo = ({ pokestop, path, availableForms }) => {
  const {
    quest_reward_type, quest_item_id, item_amount, stardust_amount,
    quest_pokemon_id, quest_form_id, quest_gender_id, quest_costume_id, quest_shiny,
    mega_pokemon_id, mega_amount,
  } = pokestop

  const questRewards = []
  switch (quest_reward_type) {
    default: return ''
    case 2:
      questRewards.push(
        <img src={`/images/item/${quest_item_id}.png`} className="quest-popup-img" />,
        <div className="amount-popup">x{item_amount}</div>,
      ); break
    case 3:
      questRewards.push(
        <img src="/images/item/-1.png" className="quest-popup-img" />,
        <div className="amount-popup">x{stardust_amount}</div>,
      ); break
    case 7:
      questRewards.push(
        <img src={`${path}/${Utility.getPokemonIcon(availableForms, quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny)}.png`} className="quest-popup-img" />,
      ); break
    case 12:
      questRewards.push(
        <img src={`${path}/${Utility.getPokemonIcon(availableForms, mega_pokemon_id, 0, 1)}.png`} className="quest-popup-img" />,
        <img src="/images/item/-8.png" className="quest-popup-img" />,
        <div className="amount-popup">x{mega_amount}</div>,
      ); break
  }
  return questRewards.map((reward, i) => (
    <Grid
      // eslint-disable-next-line react/no-array-index-key
      key={i}
      item
      xs={12 / questRewards.length}
      style={{ textAlign: 'center' }}
    >
      {reward}
    </Grid>
  ))
}

const QuestConditions = ({ pokestop, t }) => {
  const { quest_conditions, quest_type, quest_target } = pokestop
  const [type1, type2] = JSON.parse(quest_conditions)
  const primaryCondition = (
    <Typography variant="subtitle1">
      <Trans i18nKey={`quest_${quest_type}`}>
        {{ amount: quest_target }}
      </Trans>
    </Typography>
  )

  const getQuestConditions = (qType, qInfo) => {
    switch (qType) {
      default: return t(`quest_condition_${qType}`)
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
          {{ item: qInfo.item_ids.map(id => id) }}
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
          {{ alignments: t(`throw_type_${qInfo.throw_type_id}`) }}
        </Trans>
      )
      case 27: return (
        <Trans i18nKey={`quest_condition_${qType}_formatted`}>
          {{ categories: qInfo.character_category_ids.map(id => t(`character_category_${id}`)) }}
        </Trans>
      )
    }
  }
  return (
    <Grid item xs={12} style={{ textAlign: 'center' }}>
      {primaryCondition}
      {type1 && (
        <Typography variant="caption">
          {getQuestConditions(type1.type, type1.info)}
        </Typography>
      )}
      <br />
      {type2 && (
        <Typography variant="caption">
          {getQuestConditions(type2.type, type2.info)}
        </Typography>
      )}
    </Grid>
  )
}

const Footer = ({
  pokestop, expanded, setExpanded, hasInvasion, invasionExpand, setInvasionExpand, perms,
}) => {
  const classes = useStyles()
  const { navigation } = useStore(state => state.settings)
  const { navigation: { [navigation]: { url } } } = useStatic(state => state.config)
  const { lat, lon } = pokestop

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  const handleInvasionClick = () => {
    setInvasionExpand(!invasionExpand)
  }

  return (
    <>
      {(hasInvasion && perms.invasions) && (
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <IconButton
            className={classes.expand}
            onClick={handleInvasionClick}
            aria-expanded={invasionExpand}
          >
            <img
              src={`/images/misc/${invasionExpand ? 'quests' : 'invasions'}.png`}
              className="circle pulse"
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
      {perms.allPokestops && (
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <IconButton
            className={expanded ? classes.expandOpen : classes.expand}
            onClick={handleExpandClick}
            aria-expanded={expanded}
          >
            <ExpandMore />
          </IconButton>
        </Grid>
      )}
    </>
  )
}

const ExtraInfo = ({ pokestop, t, ts }) => {
  const { last_modified_timestamp, updated } = pokestop

  const extraMetaData = [
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
      justify="center"
    >
      {extraMetaData.map(meta => (
        <Fragment key={meta.description}>
          <Grid item xs={5} style={{ textAlign: 'left' }}>
            <Typography variant="caption" align="center">
              {t(meta.description)}:
            </Typography>
          </Grid>
          <Grid item xs={7} style={{ textAlign: 'right' }}>
            <Typography variant="caption" align="center">
              {meta.data}
            </Typography>
          </Grid>
        </Fragment>
      ))}
    </Grid>
  )
}

const Invasion = ({
  pokestop, path, availableForms, t,
}) => {
  const { grunt_type } = pokestop
  const { invasions: { [grunt_type]: invasion } } = useStatic(state => state.masterfile)
  const encounterNum = { first: '#1', second: '#2', third: '#3' }

  const makeShadowPokemon = pokemonId => (
    <div key={pokemonId} className="invasion-reward">
      <img
        className="invasion-reward"
        src={`${path}/${Utility.getPokemonIcon(availableForms, pokemonId)}.png`}
      />
      <img
        className="invasion-reward-shadow"
        src="/images/misc/shadow.png"
      />
    </div>
  )

  const getRewardPercent = grunt => {
    if (grunt.type === 'Giovanni') {
      return { third: '100%' }
    }
    if (grunt.second_reward) {
      return { first: '85%', second: '15%' }
    }
    return { first: '100%' }
  }

  return (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {t(invasion.type)} <Icon>{invasion.grunt.toLowerCase()}</Icon>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <table className="table-invasion">
          <tbody>
            {Object.keys(invasion.encounters).map(position => (
              <tr key={position}>
                <td>{encounterNum[position]}</td>
                <td>
                  {invasion.encounters[position].map(data => makeShadowPokemon(data))}
                </td>
                <td>{getRewardPercent(invasion)[position] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Grid>
    </Grid>
  )
}
