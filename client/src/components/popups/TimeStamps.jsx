// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'

import { Timer } from './Timer'
import { ExtraInfo } from './ExtraInfo'

/**
 *
 * @param {{ time?: number, children: string }} props
 * @returns
 */
export const TimeStamp = ({ time, children }) => {
  const { i18n } = useTranslation()

  if (!time) return null

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  return (
    <ExtraInfo title={children} data={formatter.format(time * 1000)}>
      <Grid>
        <Timer expireTime={time} />
      </Grid>
    </ExtraInfo>
  )
}
