// @ts-check
import * as React from 'react'
import { ButtonGroup, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDeepStore } from '@hooks/useStore'

/**
 * @template {import('@hooks/useStore').UseStorePaths} T
 * @template {import('@rm/types').ConfigPathValue<import('@hooks/useStore').UseStore, T>} V
 * @param {{
 *  field: T,
 *  items: readonly V[],
 *  tKey?: string,
 *  allowNone?: boolean,
 *  disabled?: boolean
 *  defaultValue?: V,
 * }} props
 * @returns
 */
export function MultiSelector({
  field,
  disabled,
  items,
  tKey,
  allowNone = false,
  defaultValue,
}) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(field, defaultValue)

  return (
    <ButtonGroup disabled={disabled} size="small" sx={{ mx: 'auto' }}>
      {items.map((item) => (
        <Button
          key={`${item}`}
          onClick={() => {
            // @ts-ignore // TODO: fix this
            setValue(item === value && allowNone ? 'none' : item)
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
