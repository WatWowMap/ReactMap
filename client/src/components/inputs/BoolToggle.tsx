// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import List from '@mui/material/List'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import { useDeepStore } from '@store/useStorage'
import { camelToSnake, fromSnakeCase } from '@utils/strings'

type BoolToggleProps = {
  field: import('@store/useStorage').UseStoragePaths
  label?: string
  disabled?: boolean
  children?: React.ReactNode
  align?: import('@mui/material').TypographyProps['align']
  switchColor?: import('@mui/material').SwitchProps['color']
  onChange?: import('@mui/material').SwitchProps['onChange']
  inset?: boolean
} & Omit<import('@mui/material').ListItemProps, 'onChange'>

export function BoolBase({
  field,
  label = field.split('.').at(-1),
  disabled = false,
  children,
  align,
  switchColor,
  onChange,
  inset,
  ...props
}: BoolToggleProps) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(field, false)

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const onChangeWrapper: import('@mui/material').SwitchProps['onChange'] =
    React.useCallback(
      (e, checked) => {
        setValue(checked)
        if (onChange) onChange(e, checked)
      },
      [field, setValue],
    )

  return (
    <ListItem {...props}>
      {children}
      {label && (
        <ListItemText inset={inset} primaryTypographyProps={{ align }}>
          {t(label, t(camelToSnake(label), fromSnakeCase(label)))}
        </ListItemText>
      )}
      <Switch
        checked={!!value}
        color={switchColor}
        disabled={disabled}
        name={label}
        onChange={onChangeWrapper}
      />
    </ListItem>
  )
}

export const BoolToggle = React.memo(BoolBase)

export function DualBoolToggle({
  items,
  switchColor,
  secondColor,
  field,
  label,
  ...props
}: {
  items: readonly [string, string]
  secondColor?: BoolToggleProps['switchColor']
  label?: `${string}-${string}`
} & Omit<BoolToggleProps, 'label'>) {
  const labels = label?.split('-', 2) || []

  return (
    <Grid2 container disableGutters disablePadding component={ListItem}>
      {items.map((item, i) => (
        <Grid2 key={item} component={List} xs={6}>
          {item && (
            <BoolToggle
              // @ts-ignore
              disableGutters
              disablePadding
              align="center"
              field={`${field}.${item}`}
              label={labels[i] || labels[0] || item}
              switchColor={i ? secondColor || switchColor : switchColor}
              {...props}
            />
          )}
        </Grid2>
      ))}
    </Grid2>
  )
}
