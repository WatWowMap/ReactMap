// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

/** @param {import('@mui/material').TypographyProps} props */
export function ToggleTypography(props) {
  const [fullName, setFullName] = React.useState(true)
  /** @type {import('@mui/material').TypographyProps['onClick']} */
  const onClick = React.useCallback((e) => {
    e.stopPropagation()
    return setFullName((prev) => !prev)
  }, [])
  return <Typography noWrap={fullName} onClick={onClick} {...props} />
}
