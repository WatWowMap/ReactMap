import * as React from 'react'
import Typography from '@mui/material/Typography'

export function ToggleTypography(
  props: import('@mui/material').TypographyProps,
) {
  const [noWrap, setNoWrap] = React.useState(true)

  const onClick: import('@mui/material').TypographyProps['onClick'] =
    React.useCallback((e) => {
      e.stopPropagation()
      return setNoWrap((prev) => !prev)
    }, [])

  return <Typography noWrap={noWrap} onClick={onClick} {...props} />
}
