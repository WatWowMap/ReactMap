// @ts-check
import * as React from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

/**
 * @param {{ questTitle: string, questTarget: number }} props
 */
export default function QuestTitle({ questTitle, questTarget }) {
  const { t, i18n } = useTranslation()

  const normalized = `quest_title_${questTitle.toLowerCase()}`

  return i18n.exists(normalized) ? (
    <Typography variant="caption">
      {t(normalized, { amount_0: questTarget })}
    </Typography>
  ) : null
}
