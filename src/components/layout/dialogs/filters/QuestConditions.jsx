// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import { useTranslation } from 'react-i18next'
import { useDeepStore, useStatic } from '@hooks/useStore'
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import Typography from '@mui/material/Typography'
import QuestTitle from '@components/layout/general/QuestTitle'

/**
 *
 * @param {{ id: string }} props
 * @returns
 */
export function QuestConditionSelector({ id }) {
  const [value, setValue] = useDeepStore(
    `filters.pokestops.filter.${id}.adv`,
    '',
  )
  const questConditions = useStatic((s) => s.available.questConditions[id])
  const hasQuests = useStatic((s) => s.ui.pokestops?.quests)

  const { t } = useTranslation()

  // Provides a reset if that condition is no longer available
  React.useEffect(() => {
    if (hasQuests) {
      // user has quest permissions
      if (!questConditions && value) {
        // condition is no longer available
        setValue('')
      } else {
        // check if the value is still valid
        const filtered = questConditions
          ? value
              .split(',')
              .filter((each) =>
                questConditions.find(({ title }) => title === each),
              )
          : []
        setValue(filtered.length ? filtered.join(',') : '')
      }
    } else {
      // user does not have quest permissions
      setValue('')
    }
  }, [questConditions, id, hasQuests])

  if (!questConditions) return null

  return (
    <ListItem>
      <FormControl variant="outlined" size="small" fullWidth sx={{ my: 1 }}>
        <InputLabel>{t('quest_condition')}</InputLabel>
        <Select
          name="adv"
          value={value.split(',')}
          fullWidth
          multiple
          renderValue={(selected) =>
            Array.isArray(selected)
              ? `${selected.length} ${t('selected')}`
              : selected
          }
          size="small"
          label={t('quest_condition')}
          onChange={(e, child) => {
            if (
              typeof child === 'object' &&
              'props' in child &&
              child.props.value === ''
            ) {
              setValue('')
            } else {
              setValue(
                Array.isArray(e.target.value)
                  ? e.target.value.filter(Boolean).join(',')
                  : e.target.value,
              )
            }
          }}
        >
          <MenuItem value="">
            <Typography variant="caption">{t('all')}</Typography>
          </MenuItem>
          {questConditions
            .slice()
            .sort((a, b) => a.title.localeCompare(b.title))
            .map(({ title, target }) => (
              <MenuItem key={`${title}-${target}`} value={title}>
                <QuestTitle questTitle={title} questTarget={target} />
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </ListItem>
  )
}
