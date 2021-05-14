/* eslint-disable camelcase */
import React, {
  Fragment, useState, useEffect,
} from 'react'
import {
  Grid, Typography, Icon, Collapse, IconButton, Divider, Menu, MenuItem, Avatar,
} from '@material-ui/core'
import { ExpandMore, Map, MoreVert } from '@material-ui/icons'
import { useStore, useMasterfile } from '../../hooks/useStore'
import useStyles from '../../hooks/useStyles'
import Utility from '../../services/Utility'

const getLure = (lureId) => {
  switch (lureId) {
    default: return ''
    case 501: return 'normal'
    case 502: return 'glacial'
    case 503: return 'mossy'
    case 504: return 'magnetic'
    case 505: return 'rainy'
  }
}

export default function PokestopPopup({
  pokestop, ts, hasLure, hasInvasion,
}) {
  const { menus: { pokestops: perms } } = useMasterfile(state => state.ui)
  const [invasionExpand, setInvasionExpand] = useState(false)
  const [extraExpand, setExtraExpand] = useState(false)
  const {
    incident_expire_timestamp, quest_type, lure_expire_timestamp, lure_id,
  } = pokestop
  const hasQuest = quest_type && perms.quests

  return (
    <Grid
      container
      style={{ minWidth: 200 }}
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      <Header pokestop={pokestop} perms={perms} />
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
            />
            {hasQuest ? (
              <>
                <Divider orientation="vertical" flexItem />
                <PokestopInfo pokestop={pokestop} />
              </>
            ) : (
              <>
                {(hasLure || hasInvasion)
                  && <Divider orientation="vertical" flexItem />}
                <Grid container item xs={6}>
                  {hasLure && <Timer expireTime={lure_expire_timestamp} lureName={getLure(lure_id)} />}
                  {hasInvasion && <Timer expireTime={incident_expire_timestamp} />}
                </Grid>
              </>
            )}
          </Grid>
        </Collapse>
      </Grid>
      {perms.invasions && (
        <Grid item xs={12}>
          <Collapse in={invasionExpand} timeout="auto" unmountOnExit>
            <Invasion pokestop={pokestop} />
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
      {perms.pokestops && (
        <Collapse in={extraExpand} timeout="auto" unmountOnExit>
          <ExtraInfo pokestop={pokestop} />
        </Collapse>
      )}
    </Grid>
  )
}

const Header = ({ pokestop, perms }) => {
  const hideList = useMasterfile(state => state.hideList)
  const setHideList = useMasterfile(state => state.setHideList)
  const excludeList = useMasterfile(state => state.excludeList)
  const setExcludeList = useMasterfile(state => state.setExcludeList)
  const timerList = useMasterfile(state => state.timerList)
  const setTimerList = useMasterfile(state => state.setTimerList)

  const [anchorEl, setAnchorEl] = useState(false)
  const [pokestopName, setPokestopName] = useState(true)
  const open = Boolean(anchorEl)
  const {
    id, grunt_type, quest_pokemon_id, quest_form_id, mega_pokemon_id,
    quest_reward_type, stardust_amount, quest_item_id, mega_amount,
  } = pokestop
  const name = pokestop.name || 'Unknown pokestop Name'

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
    switch (quest_reward_type) {
      default: setExcludeList([...excludeList, `p${quest_pokemon_id}-${quest_form_id}`]); break
      case 2: setExcludeList([...excludeList, `q${quest_item_id}`]); break
      case 3: setExcludeList([...excludeList, `d${stardust_amount}`]); break
      case 12: setExcludeList([...excludeList, `m${mega_pokemon_id}-${mega_amount}`]); break
    }
  }

  const excludeInvasion = () => {
    setAnchorEl(null)
    setExcludeList([...excludeList, `i${grunt_type}`])
  }

  const handleTimer = () => {
    setAnchorEl(null)
    setTimerList([...timerList, id])
  }

  let maxPokestopName = name.substring(0, Math.min(name.length, 30))
  if (maxPokestopName !== name) {
    maxPokestopName = `${maxPokestopName.trim()}...`
  }

  const options = [
    { name: 'Hide', action: handleHide },
  ]

  if (perms.quests && quest_reward_type) {
    options.push({ name: 'Exclude Quest', action: excludeQuest })
  }
  if (perms.invasions && grunt_type) {
    options.push(
      { name: 'Exclude Invasion', action: excludeInvasion },
      { name: 'Timer', action: handleTimer },
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
          {maxPokestopName}
        </Typography>
      </Grid>
      <Grid item xs={3}>
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
            {option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const PoiImage = ({
  pokestop, ts, hasQuest, hasLure, hasInvasion,
}) => {
  const {
    url, name, lure_id, lure_expire_timestamp, incident_expire_timestamp,
  } = pokestop

  const lureName = lure_expire_timestamp > ts ? getLure(lure_id) : ''
  const src = url
    ? url.replace('http://', 'https://')
    : '/images/misc/pokestop.png'

  return (
    <Grid
      container
      item
      xs={(hasQuest || hasInvasion || hasLure) ? 5 : 12}
      justify="center"
      alignItems="center"
    >
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <a
          href={url}
          alt={name || 'unknown'}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={src}
            alt={name || 'unknown'}
            className={`circle-image ${lureName}`}
            style={{
              maxHeight: 60,
              maxWidth: 60,
            }}
          />
        </a>
      </Grid>
      {(hasLure >= ts && hasQuest)
        && (
          <Timer
            lureName={lureName}
            expireTime={lure_expire_timestamp}
          />
        )}
      {(hasInvasion >= ts && hasQuest)
        && (
          <Timer expireTime={incident_expire_timestamp} />
        )}
    </Grid>
  )
}

const Timer = ({ expireTime, lureName }) => {
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
      {lureName && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="subtitle2">
            {Utility.getProperName(lureName)}
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
          {new Date(endTime).toLocaleTimeString()}
        </Typography>
      </Grid>
    </>
  )
}

const PokestopInfo = ({ pokestop }) => {
  const { questTypes } = useMasterfile(state => state.masterfile)
  const { icons: { path } } = useStore(state => state.settings)
  const availableForms = useMasterfile(state => state.availableForms)
  const {
    quest_reward_type, quest_target, quest_type,
    quest_item_id, item_amount, stardust_amount,
    quest_pokemon_id, quest_form_id, quest_gender_id, quest_costume_id, quest_shiny,
    mega_pokemon_id, mega_amount,
  } = pokestop
  const questType = questTypes[quest_type].text

  const getQuestReward = rewardType => {
    switch (rewardType) {
      default: return ''
      case 2: return (
        <>
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Avatar src={`/images/item/${quest_item_id}.png`} />
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Avatar>x{item_amount}</Avatar>
          </Grid>
        </>
      )
      case 3: return (
        <>
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Avatar src="/images/item/-1.png" />
          </Grid>
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            <Avatar>x{stardust_amount}</Avatar>
          </Grid>
        </>
      )
      case 7: return (
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          <Avatar src={`${path}/${Utility.getPokemonIcon(availableForms, quest_pokemon_id, quest_form_id, 0, quest_gender_id, quest_costume_id, quest_shiny)}.png`} />
        </Grid>
      )
      case 12: return (
        <>
          <Grid item xs={4} style={{ textAlign: 'center' }}>
            <Avatar src={`${path}/${Utility.getPokemonIcon(availableForms, mega_pokemon_id, 0, 1)}.png`} />
          </Grid>
          <Grid item xs={4} style={{ textAlign: 'center' }}>
            <Avatar src="/images/item/-8.png" />
          </Grid>
          <Grid item xs={4} style={{ textAlign: 'center' }}>
            <Avatar>x{mega_amount}</Avatar>
          </Grid>
        </>
      )
    }
  }

  return (
    <Grid
      item
      xs={6}
      container
      direction="row"
      justify="space-around"
      alignItems="center"
    >
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle1">
          {questType.replace('{0}', quest_target)}
        </Typography>
      </Grid>
      {getQuestReward(quest_reward_type)}
    </Grid>
  )
}

const Footer = ({
  pokestop, expanded, setExpanded, hasInvasion, invasionExpand, setInvasionExpand, perms,
}) => {
  const classes = useStyles()
  const { navigation: { url } } = useStore(state => state.settings)
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
        <Grid item xs={4}>
          <IconButton
            className={classes.expand}
            onClick={handleInvasionClick}
            aria-expanded={invasionExpand}
          >
            <img
              src={`/images/misc/${invasionExpand ? 'quests' : 'invasions'}.png`}
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
      {perms.pokestops && (
        <Grid item xs={4}>
          <IconButton
            className={expanded ? classes.expandOpen : classes.expand}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMore />
          </IconButton>
        </Grid>
      )}
    </>
  )
}

const ExtraInfo = ({ pokestop }) => {
  const { last_modified_timestamp, updated } = pokestop

  const extraMetaData = [
    {
      description: 'Last Seen:',
      data: (new Date(updated * 1000)).toLocaleTimeString(),
    },
    {
      description: 'Last Modified:',
      data: (new Date(last_modified_timestamp * 1000)).toLocaleTimeString(),
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
              {meta.description}
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

const Invasion = ({ pokestop }) => {
  const { invasions } = useMasterfile(state => state.masterfile)
  const { icons: { path } } = useStore(state => state.settings)
  const availableForms = useMasterfile(state => state.availableForms)
  const { grunt_type } = pokestop
  const invasion = invasions[grunt_type]
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

  const getGruntGender = grunt => {
    switch (grunt) {
      default: return ''
      case 'Male': return <Icon>male</Icon>
      case 'Female': return <Icon>female</Icon>
    }
  }

  return (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {invasion.type} {getGruntGender(invasion.grunt)}
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
