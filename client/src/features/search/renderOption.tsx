import { t } from 'i18next'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Grid2 from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { Img } from '@components/Img'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { RawQuestTitle } from '@components/QuestTitle'
import { getGruntReward } from '@utils/getGruntReward'
import { formatDistance } from '@utils/formatDistance'
import { getTimeUntil } from '@utils/getTimeUntil'
import { useRelativeTimer } from '@hooks/useRelativeTime'

import { OptionImageMemo } from './OptionImage'

const getBackupName = (tab: string) => {
  switch (tab) {
    case 'stations':
      return 'unknown_station'
    case 'quests':
    case 'pokestops':
      return 'unknown_pokestop'
    default:
      return 'unknown_gym'
  }
}

const MiniInvasion = ({ id, form }: { id: number; form: number }) => {
  const { Icons } = useMemory.getState()

  return <Img maxHeight={20} maxWidth={20} src={Icons.getPokemon(id, form)} />
}

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
}: import('@rm/types').Invasion) => {
  const expire = getTimeUntil(incident_expire_timestamp * 1000, true)

  if (!confirmed) return expire.str
  const { masterfile } = useMemory.getState()
  const reward = getGruntReward(masterfile.invasions[grunt_type])

  return (
    <Grid2 container alignItems="center">
      {slot_1_pokemon_id && (
        <>
          <MiniInvasion form={slot_1_form} id={slot_1_pokemon_id} />
          {!!reward.first && (
            <Typography variant="caption">
              &nbsp;{`(${reward.first}%)`}
            </Typography>
          )}
          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
        </>
      )}
      {slot_2_pokemon_id && (
        <>
          <MiniInvasion form={slot_2_form} id={slot_2_pokemon_id} />
          {!!reward.second && (
            <Typography variant="caption">
              &nbsp;{`(${reward.second}%)`}
            </Typography>
          )}
          <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
        </>
      )}
      {slot_3_pokemon_id && (
        <>
          <MiniInvasion form={slot_3_form} id={slot_3_pokemon_id} />
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

const Timer = ({ expireTime }) => {
  const time = useRelativeTimer(expireTime || 0)

  return time
}

export const renderOption: import('@mui/material').AutocompleteProps<
  any,
  false,
  false,
  boolean
>['renderOption'] = ({ key, ...props }, option) => {
  const { searchTab } = useStorage.getState()
  const { questMessage } = useMemory.getState().config.misc

  return (
    <ListItem
      key={key}
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
        primaryTypographyProps={{
          variant: 'subtitle2',
          noWrap: true,
          pr: 1,
        }}
        secondary={
          option.quest_title && option.quest_target ? (
            <RawQuestTitle
              questTarget={option.quest_target}
              questTitle={option.quest_title}
            />
          ) : option.lure_expire_timestamp ? (
            t(`lure_${option.lure_id}`).toString()
          ) : option.grunt_type ? (
            <InvasionSubtitle {...option} />
          ) : (
            ''
          )
        }
        secondaryTypographyProps={{
          variant: 'caption',
          noWrap: true,
          pr: 1,
        }}
        sx={{ flexGrow: 1, flexShrink: 1 }}
      />
      <ListItemText
        primary={formatDistance(option.distance)}
        primaryTypographyProps={{
          variant: 'subtitle2',
          align: 'right',
        }}
        secondary={
          searchTab === 'quests' ? (
            questMessage || t(`ar_quest_${!!option.with_ar}`).toString()
          ) : searchTab === 'invasions' ? (
            <Timer expireTime={option.incident_expire_timestamp} />
          ) : searchTab === 'lures' ? (
            <Timer expireTime={option.lure_expire_timestamp} />
          ) : (
            ''
          )
        }
        secondaryTypographyProps={{
          variant: 'caption',
          align: 'right',
        }}
        sx={{ flexGrow: 0, flexShrink: 0 }}
      />
    </ListItem>
  )
}
