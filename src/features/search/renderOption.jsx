// @ts-check
import * as React from 'react'
import { t } from 'i18next'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { Img } from '@components/Img'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { RawQuestTitle } from '@components/QuestTitle'
import { RawTimeSince } from '@components/popups/Timer'
import { getGruntReward } from '@utils/getGruntReward'
import { formatDistance } from '@utils/formatDistance'
import { getTimeUntil } from '@utils/getTimeUntil'

import { OptionImageMemo } from './OptionImage'

/** @param {string} tab */
const getBackupName = (tab) => {
  switch (tab) {
    case 'quests':
    case 'pokestops':
      return 'unknown_pokestop'
    default:
      return 'unknown_gym'
  }
}

const MiniInvasion = ({ id, form }) => {
  const { Icons } = useMemory.getState()
  return <Img src={Icons.getPokemon(id, form)} maxWidth={20} maxHeight={20} />
}
/** @param {import('@rm/types').Invasion} props */
const InvasionSubtitle = ({
  confirmed,
  grunt_type,
  slot_1_pokemon_id,
  slot_1_form,
  slot_2_pokemon_id,
  slot_2_form,
  slot_3_pokemon_id,
  slot_3_form,
  incident_expire_timestamp,
}) => {
  const expire = getTimeUntil(incident_expire_timestamp * 1000, true)
  if (!confirmed) return expire.str
  const { masterfile } = useMemory.getState()
  const reward = getGruntReward(masterfile.invasions[grunt_type])

  return (
    <Grid2 container alignItems="center">
      {slot_1_pokemon_id && (
        <>
          <MiniInvasion id={slot_1_pokemon_id} form={slot_1_form} />
          {!!reward.first && (
            <Typography variant="caption">
              &nbsp;{`(${reward.first}%)`}
            </Typography>
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        </>
      )}
      {slot_2_pokemon_id && (
        <>
          <MiniInvasion id={slot_2_pokemon_id} form={slot_2_form} />
          {!!reward.second && (
            <Typography variant="caption">
              &nbsp;{`(${reward.second}%)`}
            </Typography>
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        </>
      )}
      {slot_3_pokemon_id && (
        <>
          <MiniInvasion id={slot_3_pokemon_id} form={slot_3_form} />
          {!!reward.third && (
            <Typography variant="caption">
              &nbsp;{`(${reward.third}%)`}
            </Typography>
          )}
        </>
      )}
    </Grid2>
  )
}

/** @type {import('@mui/material').AutocompleteProps['renderOption']} */
export const renderOption = (props, option) => {
  const { searchTab } = useStorage.getState()
  const { questMessage } = useMemory.getState().config.misc
  return (
    <ListItem
      sx={(theme) => ({
        backgroundColor:
          option.index % 2
            ? theme.palette.background.default
            : theme.palette.grey[theme.palette.mode === 'light' ? 100 : 900],
      })}
      {...props}
    >
      <ListItemIcon>
        <OptionImageMemo {...option} />
      </ListItemIcon>
      <ListItemText
        primary={
          searchTab === 'pokemon'
            ? `${t(`poke_${option.pokemon_id}`)} ${
                option.form && t(`form_${option.form}`) !== t('poke_type_1')
                  ? `(${t(`form_${option.form}`)})`
                  : ''
              }${option.iv ? ` - ${option.iv}%` : ''}`
            : option.grunt_type
            ? t(`grunt_${option.grunt_type}`).toString()
            : option.name || t(getBackupName(searchTab))
        }
        secondary={
          option.quest_title && option.quest_target ? (
            <RawQuestTitle
              questTitle={option.quest_title}
              questTarget={option.quest_target}
            />
          ) : option.lure_expire_timestamp ? (
            t(`lure_${option.lure_id}`).toString()
          ) : option.grunt_type ? (
            <InvasionSubtitle {...option} />
          ) : (
            ''
          )
        }
        primaryTypographyProps={{
          variant: 'subtitle2',
          noWrap: true,
          pr: 1,
        }}
        secondaryTypographyProps={{
          variant: 'caption',
          noWrap: true,
          pr: 1,
        }}
        sx={{ flexGrow: 1, flexShrink: 1 }}
      />
      <ListItemText
        primary={formatDistance(option.distance)}
        secondary={
          searchTab === 'quests' ? (
            questMessage || t(`ar_quest_${!!option.with_ar}`).toString()
          ) : searchTab === 'invasions' ? (
            <RawTimeSince expireTime={option.incident_expire_timestamp} until />
          ) : searchTab === 'lures' ? (
            <RawTimeSince expireTime={option.lure_expire_timestamp} until />
          ) : (
            ''
          )
        }
        primaryTypographyProps={{
          variant: 'subtitle2',
          align: 'right',
        }}
        secondaryTypographyProps={{
          variant: 'caption',
          align: 'right',
        }}
        sx={{ flexGrow: 0, flexShrink: 0 }}
      />
    </ListItem>
  )
}
