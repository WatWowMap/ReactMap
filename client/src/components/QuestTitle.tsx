import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

export function QuestTitle(props: { questTitle: string; questTarget: number }) {
  return (
    <Typography variant="caption">
      <RawQuestTitle {...props} />
    </Typography>
  )
}

export function RawQuestTitle({
  questTitle,
  questTarget,
}: {
  questTitle: string
  questTarget: number
}) {
  const { t, i18n } = useTranslation()
  const normalized = `quest_title_${questTitle.toLowerCase()}`

  return i18n.exists(normalized) ? t(normalized, { amount_0: questTarget }) : ''
}
