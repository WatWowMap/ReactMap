// @ts-check
import * as React from 'react'
import { ButtonGroup, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDeepStore } from '@hooks/useStorage'

const SX = /** @type {import('@mui/material').SxProps} */ ({ mx: 'auto' })

/**
 * @template T
 * @param {import('@rm/types').MultiSelectorProps<T>} props
 */
export function MultiSelector({ items, value, disabled, onClick, tKey }) {
  const { t } = useTranslation()
  return (
    <ButtonGroup disabled={disabled} size="small" sx={SX}>
      {items.map((item) => (
        <Button
          key={`${item}`}
          onClick={onClick(value, item)}
          color={item === value ? 'primary' : 'secondary'}
          variant={item === value ? 'contained' : 'outlined'}
        >
          {t(tKey ? `${tKey}${item}` : `${item}`).trim() || t('any')}
        </Button>
      ))}
    </ButtonGroup>
  )
}

/**
 * @template {import('@hooks/useStorage').UseStoragePaths} T
 * @template {import('@rm/types').ConfigPathValue<import('@hooks/useStorage').UseStorage, T>} V
 * @param {{
 *  field: T,
 *  defaultValue?: V,
 *  onClick?: (oldValue: ReturnType<typeof useDeepStore>[0], newValue: V) => void
 *  allowNone?: boolean
 * } & Omit<import('@rm/types').MultiSelectorProps<V>, 'value' | 'onClick'>} props
 * @returns
 */
export function MultiSelectorStore({
  field,
  allowNone = false,
  defaultValue,
  onClick,
  ...props
}) {
  const [value, setValue] = useDeepStore(field, defaultValue)

  /** @type {(o: typeof value, n: V) => import('@mui/material').ButtonProps['onClick']} */
  const onClickWrapper = React.useCallback(
    (oldValue, newValue) => () => {
      // @ts-ignore // TODO: fix this
      setValue(newValue === oldValue && allowNone ? 'none' : newValue)
      onClick?.(oldValue, newValue)
    },
    [setValue, onClick],
  )
  return <MultiSelector value={value} onClick={onClickWrapper} {...props} />
}
