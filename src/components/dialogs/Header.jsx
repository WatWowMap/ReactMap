// @ts-check
import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { Trans, useTranslation } from 'react-i18next'

/**
 *
 * @param {{
 *  names?: string[],
 *  titles: string | string[],
 *  action?: () => void,
 * }} props
 * @returns
 */
export function Header({ names, titles, action }) {
  const { t } = useTranslation()

  return (
    <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
      {(Array.isArray(titles) ? titles : [titles]).map((title, index) =>
        names?.[index] ? (
          <Trans i18nKey={title} key={title}>
            {{ name: t(names[index]) }}
          </Trans>
        ) : (
          `${t(title)} `
        ),
      )}
      {Boolean(action) && (
        <IconButton
          onClick={action}
          style={{ position: 'absolute', right: 5, top: 2, color: 'white' }}
          size="large"
        >
          <Clear />
        </IconButton>
      )}
    </DialogTitle>
  )
}
