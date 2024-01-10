// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import List from '@mui/material/List'

import { useDeepStore } from '@hooks/useStore'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Utility from '@services/Utility'
import { fromSnakeCase } from '@services/functions/fromSnakeCase'

/**
 * @typedef {{
 *  field: import('@hooks/useStore').UseStorePaths,
 *  label?: string,
 *  disabled?: boolean,
 *  children?: React.ReactNode,
 *  align?: import('@mui/material').TypographyProps['align']
 *  switchColor?: import('@mui/material').SwitchProps['color']
 *  onChange?: import('@mui/material').SwitchProps['onChange']
 * } & Omit<import('@mui/material').ListItemProps, 'onChange'>} BoolToggleProps
 */

/** @param {BoolToggleProps} props */
export function BoolBase({
  field,
  label = field.split('.').at(-1),
  disabled = false,
  children,
  align,
  switchColor,
  onChange,
  ...props
}) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(field, false)

  /** @type {import('@mui/material').SwitchProps['onChange']} */
  const onChangeWrapper = React.useCallback(
    (e, checked) => {
      setValue(checked)
      if (onChange) onChange(e, checked)
    },
    [field, setValue],
  )
  return (
    <ListItem {...props}>
      {children}
      <ListItemText primaryTypographyProps={{ align }}>
        {t(label, t(Utility.camelToSnake(label), fromSnakeCase(label)))}
      </ListItemText>
      <Switch
        color={switchColor}
        name={label}
        onChange={onChangeWrapper}
        checked={!!value}
        disabled={disabled}
      />
    </ListItem>
  )
}

export const BoolToggle = React.memo(BoolBase)

/** @param {{ items: readonly [string, string], secondColor?: BoolToggleProps['switchColor'] } & BoolToggleProps} props */
export function DualBoolToggle({
  items,
  switchColor,
  secondColor,
  field,
  ...props
}) {
  return (
    <Grid2 container component={ListItem} disablePadding disableGutters>
      {items.map((item, i) => (
        <Grid2 key={item} xs={6} component={List}>
          {item && (
            <BoolToggle
              // @ts-ignore
              field={`${field}.${item}`}
              label={item}
              disablePadding
              disableGutters
              align="center"
              switchColor={i ? secondColor || switchColor : switchColor}
              {...props}
            />
          )}
        </Grid2>
      ))}
    </Grid2>
  )
}
