// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'

import { useMemory } from '@store/useMemory'
import { ALWAYS_EXCLUDED } from '@assets/constants'
import { getProperName } from '@utils/getProperName'
import { camelToSnake } from '@utils/camelToSnake'

export function UserPermissions() {
  const perms = useMemory((s) => s.auth.perms)
  const counts = useMemory((s) => s.auth.counts)
  const excludeList = useMemory((s) => s.auth.excludeList) || []

  return (
    <Grid2 container alignItems="stretch" justifyContent="center" spacing={2}>
      {Object.keys(perms).map((/** @type {keyof typeof perms} */ perm) => {
        if (excludeList.includes(perm) || ALWAYS_EXCLUDED.has(perm)) {
          return null
        }
        if (Array.isArray(perms[perm]) && counts[perm] === 0) {
          return null
        }
        if (
          perm === 'areaRestrictions' &&
          !perms[perm].length &&
          counts[perm] > 0
        )
          return null
        return (
          <Grid2 key={perm} xs={12} sm={6} alignItems="stretch">
            <PermCard perm={perm} />
          </Grid2>
        )
      })}
    </Grid2>
  )
}

/** @param {{ children: string | string[] }} props */
function PermMedia({ children }) {
  return (
    <Box
      flexDirection="column"
      minHeight={250}
      bgcolor="grey.900"
      className="flex-center"
    >
      {React.Children.toArray(children).map((child) => (
        <Typography
          key={child.toString()}
          variant="h6"
          align="center"
          color="white"
        >
          {child}
        </Typography>
      ))}
    </Box>
  )
}

/** @param {{ perm: keyof import('@rm/types').Permissions }} props */
function PermCard({ perm }) {
  const { t } = useTranslation()

  const permImageDir = useMemory((s) => s.config.misc.permImageDir)
  const permArrayImages = useMemory((s) => s.config.misc.permArrayImages)
  const value = useMemory((s) => s.auth.perms[perm])

  const component = React.useCallback(() => {
    if (Array.isArray(value) && !permArrayImages)
      return <PermMedia>{value.map((item) => getProperName(item))}</PermMedia>
    if (value)
      return (
        <Box
          height="250px"
          sx={{
            background: `url(/${permImageDir}/${perm}.png)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )
    return <PermMedia>{t('no_access')}</PermMedia>
  }, [value, perm, permImageDir, t])

  const textColor = value ? 'text.primary' : 'text.disabled'
  return (
    <Card elevation={2} style={{ height: '100%' }}>
      <CardMedia component={component} />
      <CardContent style={{ minHeight: 100 }}>
        <Typography gutterBottom variant="h6" color={textColor}>
          {t(camelToSnake(perm))}
        </Typography>
        <Typography variant="body2" color={textColor}>
          {t(`${camelToSnake(perm)}_subtitle`)}
        </Typography>
      </CardContent>
    </Card>
  )
}
