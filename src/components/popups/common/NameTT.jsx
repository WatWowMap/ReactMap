import * as React from 'react'
import { Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function NameTT({ id, children }) {
  const { t } = useTranslation()

  return (
    <Tooltip
      enterDelay={0}
      enterTouchDelay={0}
      placement="left-start"
      title={
        Array.isArray(id)
          ? id
              .filter(Boolean)
              .map((i) => t(i))
              .join(' ')
          : t(id)
      }
    >
      {children}
    </Tooltip>
  )
}
