// @ts-check
import * as React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import useMediaQuery from '@mui/material/useMediaQuery'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'

import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { useMemory } from '@hooks/useMemory'
import { useLayoutStore } from '@hooks/useLayoutStore'

import { DialogWrapper } from '../../components/dialogs/DialogWrapper'

const GAP = 2

/** @type {(theme: import('@mui/material').Theme) => import('@mui/system').SystemStyleObject<import('@mui/material').Theme>} */
const SX_PROPS = (theme) => ({
  borderColor: theme.palette.grey[theme.palette.mode === 'dark' ? 600 : 300],
  border: '3px solid',
  borderRadius: 4,
})

const SUB_SX_PROPS = /** @type {typeof SX_PROPS} */ (
  (theme) => ({
    borderColor: theme.palette.grey[theme.palette.mode === 'dark' ? 600 : 300],
    borderBottom: '3px solid',
    p: 0.5,
  })
)

const AND_ITEMS = [
  'iv',
  'level',
  'cp',
  'slider_atk_iv',
  'slider_def_iv',
  'slider_sta_iv',
]

const OR_ITEMS = [
  'slider_little',
  'slider_great',
  'slider_ultra',
  'size_1',
  'size_5',
]

/** @param {{ children: string } & import('@mui/material').TypographyProps} props */
function ChildText({ children, ...props }) {
  const { t } = useTranslation()
  return (
    <Typography variant="h6" align="center" width="100%" {...props}>
      {t(children)}
    </Typography>
  )
}

/** @param {{ title: string, children: React.ReactNode, bgcolor: import('@mui/material').BoxProps['bgcolor'], fullSize?: boolean }} props */
function Card({ title, children, bgcolor, fullSize }) {
  const { t, i18n } = useTranslation()
  return (
    <Grid2
      direction="column"
      sx={SX_PROPS}
      m={GAP}
      overflow="hidden"
      xs={12}
      sm={fullSize ? 12 : 6}
    >
      <Box width="100%" bgcolor={`${bgcolor}.main`} sx={SUB_SX_PROPS}>
        <Typography variant="h5" color="white" align="center">
          {t(title)}
        </Typography>
        {i18n.exists(`${title}_caption`) && (
          <Typography
            variant="caption"
            color="white"
            width="100%"
            textAlign="center"
            component="p"
          >
            {t(`${title}_caption`)}
          </Typography>
        )}
      </Box>
      <Box p={GAP / 2}>{children}</Box>
    </Grid2>
  )
}

const handleClose = () => useLayoutStore.setState({ pkmnFilterHelp: false })

const OPTIONS =
  /** @type {import('@components/dialogs/Footer').FooterButton[]} */ ([
    { name: 'close', color: 'error', action: handleClose },
  ])

export function PkmnFilterHelp() {
  const { t } = useTranslation()
  const perms = useMemory((s) => s.auth.perms)
  const isMobile = useMediaQuery(
    (/** @type {import('@mui/material').Theme} */ theme) =>
      theme.breakpoints.down('md'),
  )

  if (!perms.pokemon) return null
  return (
    <DialogWrapper dialog="pkmnFilterHelp" maxWidth="md">
      <Header titles={t('filter_help')} action={handleClose} />
      <DialogContent sx={{ p: 0, height: '100%', alignItems: 'center' }}>
        <Grid2
          container
          alignItems="stretch"
          justifyContent="space-around"
          height="100%"
          p={GAP}
          columns={13}
        >
          <Grid2 xs={12} md={8} my={GAP / 2}>
            <Typography
              variant="h4"
              px={GAP}
              pt={GAP}
              pb={{ xs: 0, md: GAP + 0.5 }}
            >
              {t('global_and_individual')}
            </Typography>
            <Divider flexItem sx={{ my: 2, borderColor: 'darkgrey' }} />
            <Card title="gender_filters_all" bgcolor="success" fullSize>
              <Grid2 container columns={16} justifyContent="center">
                <Card title="and" bgcolor="primary">
                  {AND_ITEMS.map((child) => (
                    <ChildText
                      key={child}
                      color={perms.iv ? 'inherit' : 'GrayText'}
                    >
                      {child}
                    </ChildText>
                  ))}
                </Card>
                <Card title="or" bgcolor="secondary">
                  <Box py={1} />
                  {OR_ITEMS.map((child) => (
                    <ChildText
                      key={child}
                      color={
                        (child.startsWith('slider') ? perms.pvp : perms.iv)
                          ? 'inherit'
                          : 'GrayText'
                      }
                    >
                      {child}
                    </ChildText>
                  ))}
                </Card>
              </Grid2>
            </Card>
          </Grid2>
          {!isMobile && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: 'darkgrey' }}
            />
          )}
          <Grid2 xs={12} md={4} my={GAP / 2} container direction="column">
            <Typography variant="h4" px={GAP} pt={GAP}>
              {t('only_global')}
            </Typography>
            <Typography variant="caption" width="100%" component="p" px={GAP}>
              {t('global_caption')}
            </Typography>
            <Divider flexItem sx={{ my: 2, borderColor: 'darkgrey' }} />
            <Chip
              label={t('zero_iv')}
              color="primary"
              disabled={!perms.iv}
              sx={[SX_PROPS, { my: 1, mx: GAP }]}
            />
            <Chip
              label={t('hundo_iv')}
              color="primary"
              disabled={!perms.iv}
              sx={[SX_PROPS, { my: 1, mx: GAP }]}
            />
          </Grid2>
        </Grid2>
      </DialogContent>
      <Footer options={OPTIONS} />
    </DialogWrapper>
  )
}
