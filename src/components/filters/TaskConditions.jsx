// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useDeepStore, useStorage } from '@store/useStorage'
import { useTranslateById } from '@hooks/useTranslateById'
import { FCSelect } from '@components/inputs/FCSelect'

/**
 * The reverse of QuestConditionSelector: narrows a task-primary filter
 * (`k<title>-<target>`) down to specific reward keys, instead of narrowing a
 * reward-primary filter down to specific task conditions. Same `.adv`
 * mechanism, same UI shape, opposite direction.
 * @param {{ id: string }} props
 * @returns
 */
export function TaskRewardSelector({ id }) {
  const { t } = useTranslation()
  const { t: tId } = useTranslateById()
  const [value, setValue] = useDeepStore(
    `filters.pokestops.filter.${id}.adv`,
    '',
  )
  const all = useStorage((s) => !!s.filters.pokestops.filter[id].all)
  const taskRewards = useMemory((s) => s.available.taskConditions[id]?.rewards)
  const hasQuests = useMemory((s) => s.ui.pokestops?.quests)

  const [open, setOpen] = React.useState(false)

  const handleClose = () => setOpen(false)

  const handleOpen = () => setOpen(true)

  // Provides a reset if that reward is no longer available
  React.useEffect(() => {
    if (hasQuests) {
      // user has quest permissions
      if (!taskRewards && value) {
        // reward is no longer available
        setValue('')
      } else {
        // check if the value is still valid
        const filtered = taskRewards
          ? value.split(',').filter((each) => taskRewards.includes(each))
          : []
        setValue(filtered.length ? filtered.join(',') : '')
      }
    } else {
      // user does not have quest permissions
      setValue('')
    }
  }, [taskRewards, id, hasQuests])

  if (!taskRewards) return null

  return (
    <FCSelect
      label={t('task_reward')}
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
          if (e.target.value.length === 0) handleClose()
        }
      }}
      fcSx={{ my: 1 }}
    >
      <MenuItem value="">
        <Typography variant="caption">{t('all')}</Typography>
      </MenuItem>
      {taskRewards
        .slice()
        .sort((a, b) => tId(a).localeCompare(tId(b)))
        .map((rewardKey) => (
          <MenuItem key={rewardKey} value={rewardKey}>
            {tId(rewardKey, { omitFormSuffix: true })}
          </MenuItem>
        ))}
    </FCSelect>
  )
}
