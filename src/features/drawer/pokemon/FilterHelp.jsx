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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { useMemory } from '@store/useMemory'
import { useLayoutStore } from '@store/useLayoutStore'
import { useStorage } from '@store/useStorage'
import { DialogWrapper } from '@components/dialogs/DialogWrapper'

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

function ExpertModeGuide() {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
      {/* Basic Syntax Section */}
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {t('expert_basic_syntax')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_clause_description')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_format_description')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_value_description')}
      </Typography>

      {/* Filter Prefixes Table */}
      <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
        {t('expert_filter_prefixes')}
      </Typography>

      <Typography variant="body2" paragraph>
        {t('expert_prefixes_description')}
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>{t('prefix')}</strong>
              </TableCell>
              <TableCell>
                <strong>{t('attribute')}</strong>
              </TableCell>
              <TableCell>
                <strong>{t('description_and_example')}</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <em>{t('none')}</em>
              </TableCell>
              <TableCell>{t('iv_percentage')}</TableCell>
              <TableCell>
                {t('expert_iv_example')} <code>90-100</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>A</code>
              </TableCell>
              <TableCell>{t('attack_iv')}</TableCell>
              <TableCell>
                {t('expert_attack_example')} <code>A15</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>D</code>
              </TableCell>
              <TableCell>{t('defense_iv')}</TableCell>
              <TableCell>
                {t('expert_defense_example')} <code>D12-15</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>S</code>
              </TableCell>
              <TableCell>{t('stamina_iv')}</TableCell>
              <TableCell>
                {t('expert_stamina_example')} <code>S10-15</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>L</code>
              </TableCell>
              <TableCell>{t('level')}</TableCell>
              <TableCell>
                {t('expert_level_example')} <code>L30-35</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>CP</code>
              </TableCell>
              <TableCell>{t('combat_power')}</TableCell>
              <TableCell>
                {t('expert_cp_example')} <code>CP2000-2500</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>G</code>
              </TableCell>
              <TableCell>{t('gender')}</TableCell>
              <TableCell>
                {t('expert_gender_example')} <code>G1</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>X</code>
              </TableCell>
              <TableCell>{t('size')}</TableCell>
              <TableCell>
                {t('expert_size_example')} <code>X5</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>GL</code>
              </TableCell>
              <TableCell>{t('great_league')}</TableCell>
              <TableCell>
                {t('expert_great_league_example')} <code>GL1-100</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>UL</code>
              </TableCell>
              <TableCell>{t('ultra_league')}</TableCell>
              <TableCell>
                {t('expert_ultra_league_example')} <code>UL1-50</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <code>LC</code>
              </TableCell>
              <TableCell>{t('little_cup')}</TableCell>
              <TableCell>
                {t('expert_little_cup_example')} <code>LC1-20</code>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      {/* Combining Filters Section */}
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {t('expert_combining_filters')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_combining_description')}
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
        {t('expert_and_operator')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_and_description')}
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Typography variant="body2" component="div">
          <strong>{t('example')}:</strong> {t('expert_hundo_example')}
          <br />
          {t('expert_hundo_description')}
          <br />
          <code>A15 & D15 & S15</code>
        </Typography>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Typography variant="body2" component="div">
          <strong>{t('expert_another_example')}:</strong>{' '}
          {t('expert_high_level_example')}
          <br />
          <code>L30-35 & A14-15 & 90-100</code>
        </Typography>
      </Box>

      <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
        {t('expert_or_operator')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_or_description')}
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Typography variant="body2" component="div">
          <strong>{t('example')}:</strong> {t('expert_pvp_example')}
          <br />
          <code>GL1-100 , UL1-100</code>
        </Typography>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Typography variant="body2" component="div">
          <strong>{t('expert_another_example')}:</strong>{' '}
          {t('expert_perfect_or_level_example')}
          <br />
          <code>100 | L35</code>
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Building Complex Filters Section */}
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {t('expert_complex_filters')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_complex_description')}
      </Typography>

      <Typography variant="body1" paragraph>
        {t('expert_complex_format')}
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <Typography variant="body2" component="div">
          <strong>{t('example')}:</strong>{' '}
          {t('expert_complex_example_description')}
          <br />
          <br />
          <strong>{t('expert_group_1')}:</strong>{' '}
          {t('expert_group_1_description')}
          <br />
          <code>GL1-50 , UL1-50</code>
          <br />
          <br />
          <strong>{t('expert_group_2')}:</strong>{' '}
          {t('expert_group_2_description')}
          <br />
          <code>L30-35 & A15</code>
          <br />
          <br />
          {t('expert_combine_description')}
          <br />
          <code>GL1-50 , UL1-50 | L30-35 & A15</code>
          <br />
          <br />
          {t('expert_result_description')}
        </Typography>
      </Box>
    </Box>
  )
}

export function PkmnFilterHelp() {
  const { t } = useTranslation()
  const perms = useMemory((s) => s.auth.perms)
  const filterMode = useStorage((s) => s.getPokemonFilterMode())
  const isMobile = useMediaQuery(
    (/** @type {import('@mui/material').Theme} */ theme) =>
      theme.breakpoints.down('md'),
  )

  if (!perms.pokemon) return null

  return (
    <DialogWrapper dialog="pkmnFilterHelp" maxWidth="md">
      <Header titles={t('filter_help')} action={handleClose} />
      <DialogContent sx={{ p: 0, height: '100%', alignItems: 'center' }}>
        {filterMode === 'expert' ? (
          <ExpertModeGuide />
        ) : (
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
        )}
      </DialogContent>
      <Footer options={OPTIONS} />
    </DialogWrapper>
  )
}
