// @ts-check
import * as React from 'react'
import SvgIcon from '@mui/material/SvgIcon'
import useTheme from '@mui/material/styles/useTheme'

const PATH = {
  0: '',
  1: 'M9.5 11c1.93 0 3.5 1.57 3.5 3.5S11.43 18 9.5 18 6 16.43 6 14.5 7.57 11 9.5 11zm0-2C6.46 9 4 11.46 4 14.5S6.46 20 9.5 20s5.5-2.46 5.5-5.5c0-1.16-.36-2.23-.97-3.12L18 7.42V10h2V4h-6v2h2.58l-3.97 3.97C11.73 9.36 10.66 9 9.5 9z',
  2: 'M17.5 9.5C17.5 6.46 15.04 4 12 4S6.5 6.46 6.5 9.5c0 2.7 1.94 4.93 4.5 5.4V17H9v2h2v2h2v-2h2v-2h-2v-2.1c2.56-.47 4.5-2.7 4.5-5.4zm-9 0C8.5 7.57 10.07 6 12 6s3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5z',
  3: 'M12 8c1.93 0 3.5 1.57 3.5 3.5S13.93 15 12 15s-3.5-1.57-3.5-3.5S10.07 8 12 8zm4.53.38 3.97-3.96V7h2V1h-6v2h2.58l-3.97 3.97C14.23 6.36 13.16 6 12 6s-2.23.36-3.11.97l-.65-.65 1.41-1.41-1.41-1.42L6.82 4.9 4.92 3H7.5V1h-6v6h2V4.42l1.91 1.9-1.42 1.42L5.4 9.15l1.41-1.41.65.65c-.6.88-.96 1.95-.96 3.11 0 2.7 1.94 4.94 4.5 5.41V19H9v2h2v2h2v-2h2v-2h-2v-2.09c2.56-.47 4.5-2.71 4.5-5.41 0-1.16-.36-2.23-.97-3.12z',
}

/** @param {{ gender: keyof typeof PATH } & import('@mui/material').SvgIconProps} props */
export function GenderIcon({ gender, ...props }) {
  const theme = useTheme()

  return (
    <SvgIcon fontSize={gender === 3 ? 'small' : 'medium'} {...props}>
      <path d={PATH[gender]} fill={theme.palette.text.primary} />
    </SvgIcon>
  )
}
