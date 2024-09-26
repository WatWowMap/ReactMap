import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'

import { Loading } from '@components/Loading'

import { useGetWebhookData } from '../../hooks/useGetWebhookData'
import { MemoNewProfile } from './NewProfile'
import { ProfileTile } from './ProfileTile'

export type View = 'profile' | 'edit' | 'delete' | 'copy'

export type Props = {
  uid: number
  handleViewChange: (newView: View) => () => void
}

export function ProfileEditing() {
  const { data, loading } = useGetWebhookData('profile')
  const { t } = useTranslation()

  return loading ? (
    <Loading>{t('loading', { category: t('profile') })}</Loading>
  ) : (
    <Grid container alignItems="center" justifyContent="center" py={2} px={4}>
      <MemoNewProfile />
      {data.map(({ uid }) => (
        <ProfileTile key={uid} uid={uid} />
      ))}
    </Grid>
  )
}
