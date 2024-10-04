// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import { useTranslation } from 'react-i18next'
import { useDeepStore, UseStorage, UseStoragePaths } from '@store/useStorage'
import { SxProps } from '@mui/material'
import { ObjectPathValue } from '@rm/types'

const SX: SxProps = { mx: 'auto' }

export interface MultiSelectorProps<V> {
  value: V
  items: readonly V[]
  tKey?: string
  disabled?: boolean
  onClick?: (
    oldValue: V,
    newValue: V,
  ) => (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

export function MultiSelector<T>({
  items,
  value,
  disabled,
  onClick,
  tKey,
}: MultiSelectorProps<T>) {
  const { t } = useTranslation()

  return (
    <ButtonGroup disabled={disabled} size="small" sx={SX}>
      {items.map((item) => (
        <Button
          key={`${item}`}
          color={item === value ? 'primary' : 'secondary'}
          variant={item === value ? 'contained' : 'outlined'}
          onClick={onClick(value, item)}
        >
          {t(tKey ? `${tKey}${item}` : `${item}`).trim() || t('any')}
        </Button>
      ))}
    </ButtonGroup>
  )
}

export function MultiSelectorStore<
  T extends UseStoragePaths,
  V extends ObjectPathValue<UseStorage, T>,
>({
  field,
  allowNone = false,
  defaultValue,
  onClick,
  ...props
}: {
  field: T
  defaultValue?: V
  onClick?: (oldValue: V, newValue: V) => void
  allowNone?: boolean
} & Omit<MultiSelectorProps<V>, 'value' | 'onClick'>) {
  const [value, setValue] = useDeepStore(field, defaultValue)

  const onClickWrapper: (
    o: V,
    n: V,
  ) => import('@mui/material').ButtonProps['onClick'] = React.useCallback(
    (oldValue, newValue) => () => {
      // @ts-ignore
      setValue(newValue === oldValue && allowNone ? 'none' : newValue)
      onClick?.(oldValue, newValue)
    },
    [setValue, onClick],
  )

  return <MultiSelector value={value} onClick={onClickWrapper} {...props} />
}
