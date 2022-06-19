import React from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation, Trans } from 'react-i18next'

export default function QuestTitle({ questTitle, questTarget }) {
  const { i18n } = useTranslation()

  const normalized = `quest_title_${questTitle.toLowerCase()}`

  return i18n.exists(normalized) ? (
    <Typography variant="caption">
      <Trans i18nKey={normalized}>{{ amount_0: questTarget }}</Trans>
    </Typography>
  ) : null
}
