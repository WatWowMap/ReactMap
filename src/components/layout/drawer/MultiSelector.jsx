// @ts-check
import * as React from 'react'
import { ButtonGroup, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useStore } from '@hooks/useStore'
import dlv from 'dlv'
import { setDeep } from '@services/functions/setDeep'

/**
 *
 * @param {{
 *  field: string,
 *  items: readonly (string | number)[],
 *  tKey?: string,
 *  allowNone?: boolean,
 * }} props
 * @returns
 */
export function MultiSelector({ field, items, tKey, allowNone = false }) {
  const { t } = useTranslation()
  const value = useStore((s) => dlv(s, field))

  return (
    <ButtonGroup size="small" sx={{ mx: 'auto' }}>
      {items.map((item) => (
        <Button
          key={item}
          onClick={() => {
            useStore.setState((prev) =>
              setDeep(prev, field, item === value && allowNone ? 'none' : item),
            )
          }}
          color={item === value ? 'primary' : 'secondary'}
          variant={item === value ? 'contained' : 'outlined'}
        >
          {t(tKey ? `${tKey}${item}` : `${item}`).trim() || t('any')}
        </Button>
      ))}
    </ButtonGroup>
  )
}
