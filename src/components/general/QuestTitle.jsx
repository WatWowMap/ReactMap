// @ts-check
import * as React from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

/**
 * @param {{ questTitle: string, questTarget: number }} props
 */
export default function QuestTitle(props) {
  return (
    <Typography variant="caption">
      <RawQuestTitle {...props} />
    </Typography>
  )
}

/**
 * @param {{ questTitle: string, questTarget: number }} props
 */
export function RawQuestTitle({ questTitle, questTarget }) {
  const { t, i18n } = useTranslation()
  const normalized = `quest_title_${questTitle.toLowerCase()}`
  return i18n.exists(normalized) ? t(normalized, { amount_0: questTarget }) : ''
}
