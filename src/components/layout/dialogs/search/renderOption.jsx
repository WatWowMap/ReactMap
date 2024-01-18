// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { t } from 'i18next'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { RawQuestTitle } from '@components/layout/general/QuestTitle'

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

/** @type {import('@mui/material').AutocompleteProps['renderOption']} */
export const renderOption = (props, option) => {
  const { searchTab } = useStorage.getState()
  const { distanceUnit, questMessage } = useMemory.getState().config.misc

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
            : option.name || t(getBackupName(searchTab))
        }
        secondary={
          option.quest_title && option.quest_target ? (
            <RawQuestTitle
              questTitle={option.quest_title}
              questTarget={option.quest_target}
            />
          ) : option.lure_expire_timestamp ? (
            new Date(option.lure_expire_timestamp * 1000).toLocaleString()
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
        primary={`${option.distance} ${
          distanceUnit === 'mi' ? t('mi') : t('km')
        }`}
        secondary={
          searchTab === 'quests' &&
          (questMessage || t(`ar_quest_${!!option.with_ar}`).toString())
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
