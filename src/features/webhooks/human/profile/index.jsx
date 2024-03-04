// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'

import { Loading } from '@components/Loading'

import { useGetWebhookData } from '../../hooks/useGetWebhookData'
import { MemoNewProfile } from './NewProfile'
import { ProfileTile } from './ProfileTile'

/**
 * @typedef {'profile' | 'edit' | 'delete' | 'copy'} View
 * @typedef {{ uid: number, handleViewChange: (newView: View) => () => void}} Props
 */

export default function ProfileEditing() {
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
