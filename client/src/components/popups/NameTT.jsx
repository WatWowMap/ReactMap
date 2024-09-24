// @ts-check
import * as React from 'react'
import Tooltip from '@mui/material/Tooltip'
import { useTranslation } from 'react-i18next'

/**
 *
 * @param {{ title: string | string[] } & Omit<import('@mui/material').TooltipProps, 'title'>} props
 * @returns
 */
export function NameTT({ title, children }) {
  const { t } = useTranslation()

  return (
    <Tooltip
      enterDelay={0}
      enterTouchDelay={0}
      placement="left-start"
      title={
        Array.isArray(title)
          ? title
              .filter(Boolean)
              .map((i) => t(i))
              .join(' ')
          : t(title)
      }
    >
      {children}
    </Tooltip>
  )
}
