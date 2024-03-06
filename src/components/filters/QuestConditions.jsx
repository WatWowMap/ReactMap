// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useDeepStore, useStorage } from '@store/useStorage'
import { QuestTitle } from '@components/QuestTitle'
import { FCSelect } from '@components/inputs/FCSelect'

/**
 *
 * @param {{ id: string }} props
 * @returns
 */
export function QuestConditionSelector({ id }) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(
    `filters.pokestops.filter.${id}.adv`,
    '',
  )
  const all = useStorage((s) => !!s.filters.pokestops.filter[id].all)
  const questConditions = useMemory((s) => s.available.questConditions[id])
  const hasQuests = useMemory((s) => s.ui.pokestops?.quests)

  const [open, setOpen] = React.useState(false)

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

  const handleClose = () => {
    setOpen(false)
  }

  const handleOpen = () => {
    setOpen(true)
  }

  if (!questConditions) return null

  return (
    <FCSelect
      label={t('quest_condition')}
      value={value.split(',')}
      disabled={all}
      fullWidth
      open={open}
      onOpen={handleOpen}
      onClose={handleClose}
      multiple
      renderValue={(selected) =>
        Array.isArray(selected)
          ? `${selected.length} ${t('selected')}`
          : selected
      }
      onChange={(e, child) => {
        if (
          typeof child === 'object' &&
          'props' in child &&
          child.props.value === ''
        ) {
          setValue('')
          handleClose()
        } else {
          setValue(
            Array.isArray(e.target.value)
              ? e.target.value.filter(Boolean).join(',')
              : e.target.value,
          )
        }
      }}
      fcSx={{ my: 1 }}
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
    </FCSelect>
  )
}
