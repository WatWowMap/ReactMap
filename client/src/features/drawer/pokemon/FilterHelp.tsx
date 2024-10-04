import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import useMediaQuery from '@mui/material/useMediaQuery'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import { Header } from '@components/dialogs/Header'
import { Footer, FooterButton } from '@components/dialogs/Footer'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { DialogWrapper } from '@components/dialogs/DialogWrapper'

const GAP = 2

const SX_PROPS: (
  theme: import('@mui/material').Theme,
) => import('@mui/system').SystemStyleObject<import('@mui/material').Theme> = (
  theme,
): import('@mui/system').SystemStyleObject<import('@mui/material').Theme> => ({
  borderColor: theme.palette.grey[theme.palette.mode === 'dark' ? 600 : 300],
  border: '3px solid',
  borderRadius: 4,
})

const SUB_SX_PROPS: typeof SX_PROPS = /** @type {typeof SX_PROPS} */ (
  theme,
) => ({
  borderColor: theme.palette.grey[theme.palette.mode === 'dark' ? 600 : 300],
  borderBottom: '3px solid',
  p: 0.5,
})

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
function ChildText({
  children,
  ...props
}: { children: string } & import('@mui/material').TypographyProps) {
  const { t } = useTranslation()

  return (
    <Typography align="center" variant="h6" width="100%" {...props}>
      {t(children)}
    </Typography>
  )
}

/** @param {{ title: string, children: React.ReactNode, bgcolor: import('@mui/material').BoxProps['bgcolor'], fullSize?: boolean }} props */
function Card({
  title,
  children,
  bgcolor,
  fullSize,
}: {
  title: string
  children: React.ReactNode
  bgcolor: import('@mui/material').BoxProps['bgcolor']
  fullSize?: boolean
}) {
  const { t, i18n } = useTranslation()

  return (
    <Grid2
      direction="column"
      m={GAP}
      overflow="hidden"
      sm={fullSize ? 12 : 6}
      sx={SX_PROPS}
      xs={12}
    >
      <Box bgcolor={`${bgcolor}.main`} sx={SUB_SX_PROPS} width="100%">
        <Typography align="center" color="white" variant="h5">
          {t(title)}
        </Typography>
        {i18n.exists(`${title}_caption`) && (
          <Typography
            color="white"
            component="p"
            textAlign="center"
            variant="caption"
            width="100%"
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

const OPTIONS: FooterButton[] = [
  { name: 'close', color: 'error', action: handleClose },
]

export function PkmnFilterHelp() {
  const { t } = useTranslation()
  const perms = useMemory((s) => s.auth.perms)
  const isMobile = useMediaQuery(
    (
      /** @type {import('@mui/material').Theme} */ theme: import('@mui/material').Theme,
    ) => theme.breakpoints.down('md'),
  )

  if (!perms.pokemon) return null

  return (
    <DialogWrapper dialog="pkmnFilterHelp" maxWidth="md">
      <Header action={handleClose} titles={t('filter_help')} />
      <DialogContent sx={{ p: 0, height: '100%', alignItems: 'center' }}>
        <Grid2
          container
          alignItems="stretch"
          columns={13}
          height="100%"
          justifyContent="space-around"
          p={GAP}
        >
          <Grid2 md={8} my={GAP / 2} xs={12}>
            <Typography
              pb={{ xs: 0, md: GAP + 0.5 }}
              pt={GAP}
              px={GAP}
              variant="h4"
            >
              {t('global_and_individual')}
            </Typography>
            <Divider flexItem sx={{ my: 2, borderColor: 'darkgrey' }} />
            <Card fullSize bgcolor="success" title="gender_filters_all">
              <Grid2 container columns={16} justifyContent="center">
                <Card bgcolor="primary" title="and">
                  {AND_ITEMS.map((child) => (
                    <ChildText
                      key={child}
                      color={perms.iv ? 'inherit' : 'GrayText'}
                    >
                      {child}
                    </ChildText>
                  ))}
                </Card>
                <Card bgcolor="secondary" title="or">
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
              flexItem
              orientation="vertical"
              sx={{ borderColor: 'darkgrey' }}
            />
          )}
          <Grid2 container direction="column" md={4} my={GAP / 2} xs={12}>
            <Typography pt={GAP} px={GAP} variant="h4">
              {t('only_global')}
            </Typography>
            <Typography component="p" px={GAP} variant="caption" width="100%">
              {t('global_caption')}
            </Typography>
            <Divider flexItem sx={{ my: 2, borderColor: 'darkgrey' }} />
            <Chip
              color="primary"
              disabled={!perms.iv}
              label={t('zero_iv')}
              sx={[SX_PROPS, { my: 1, mx: GAP }]}
            />
            <Chip
              color="primary"
              disabled={!perms.iv}
              label={t('hundo_iv')}
              sx={[SX_PROPS, { my: 1, mx: GAP }]}
            />
          </Grid2>
        </Grid2>
      </DialogContent>
      <Footer options={OPTIONS} />
    </DialogWrapper>
  )
}
