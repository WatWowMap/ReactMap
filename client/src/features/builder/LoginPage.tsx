import { useTranslation } from 'react-i18next'
import Grid from '@mui/material/Unstable_Grid2'
import { useQuery } from '@apollo/client'
import { CUSTOM_COMPONENT } from '@services/queries/config'
import { Loading } from '@components/Loading'

import { CustomTile } from './components/CustomTile'

export function CustomLoginPage() {
  const { t, i18n } = useTranslation()
  const { data, loading } = useQuery(CUSTOM_COMPONENT, {
    fetchPolicy: 'cache-first',
    variables: { component: 'loginPage' },
  })

  if (loading) {
    return <Loading height="100vh">{t('loading', { category: '' })}</Loading>
  }

  const { settings, components } = data?.customComponent || {
    settings: {},
    components: [],
  }

  return (
    <Grid
      key={i18n.language}
      container
      alignItems={settings.parentAlignItems || 'center'}
      justifyContent={settings.parentJustifyContent || 'center'}
      spacing={settings.parentSpacing || 0}
      style={settings.parentStyle || {}}
      sx={settings.parentSx || {}}
    >
      {components.map((block, i) => (
        <CustomTile key={i} block={block} />
      ))}
    </Grid>
  )
}
