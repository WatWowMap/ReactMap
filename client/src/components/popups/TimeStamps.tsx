import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'

import { Timer } from './Timer'
import { ExtraInfo } from './ExtraInfo'

export function TimeStamp({
  time,
  children,
}: {
  time?: number
  children: string
}) {
  const { i18n } = useTranslation()

  if (!time) return null

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  return (
    <ExtraInfo data={formatter.format(time * 1000)} title={children}>
      <Grid>
        <Timer expireTime={time} />
      </Grid>
    </ExtraInfo>
  )
}
