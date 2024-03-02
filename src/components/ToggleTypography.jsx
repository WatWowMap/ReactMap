// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

/** @param {import('@mui/material').TypographyProps} props */
export function ToggleTypography(props) {
  const [noWrap, setNoWrap] = React.useState(true)

  /** @type {import('@mui/material').TypographyProps['onClick']} */
  const onClick = React.useCallback((e) => {
    e.stopPropagation()
    return setNoWrap((prev) => !prev)
  }, [])

  return <Typography noWrap={noWrap} onClick={onClick} {...props} />
}
