import * as React from 'react'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import { useMemory } from '@store/useMemory'
import { ALWAYS_EXCLUDED } from '@assets/constants'
import { getProperName, camelToSnake } from '@utils/strings'

export function UserPermissions() {
  const perms = useMemory((s) => s.auth.perms)
  const counts = useMemory((s) => s.auth.counts)
  const excludeList = useMemory((s) => s.auth.excludeList) || []

  return (
    <Grid2 container alignItems="stretch" justifyContent="center" spacing={2}>
      {Object.keys(perms).map((perm: keyof typeof perms) => {
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
          <Grid2 key={perm} alignItems="stretch" sm={6} xs={12}>
            <PermCard perm={perm} />
          </Grid2>
        )
      })}
    </Grid2>
  )
}

/** @param {{ children: string | string[] }} props */
function PermMedia({ children }: { children: string | string[] }) {
  return (
    <Box
      bgcolor="grey.900"
      className="flex-center"
      flexDirection="column"
      minHeight={250}
    >
      {React.Children.toArray(children).map((child) => (
        <Typography
          key={child.toString()}
          align="center"
          color="white"
          variant="h6"
        >
          {child}
        </Typography>
      ))}
    </Box>
  )
}

function PermCard({ perm }: { perm: keyof import('@rm/types').Permissions }) {
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
          minHeight="250px"
          sx={{
            background: `url(/${permImageDir}/${perm}.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            aspectRatio: '1/1',
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
        <Typography gutterBottom color={textColor} variant="h6">
          {t(camelToSnake(perm))}
        </Typography>
        <Typography color={textColor} variant="body2">
          {t(`${camelToSnake(perm)}_subtitle`)}
        </Typography>
      </CardContent>
    </Card>
  )
}
