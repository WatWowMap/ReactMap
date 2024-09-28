import Clear from '@mui/icons-material/Clear'
import Save from '@mui/icons-material/Save'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { ALL_PROFILES, SET_PROFILE } from '@services/queries/webhook'
import { useWebhookStore } from '@store/useWebhookStore'

import { handleUpdate } from './handleUpdate'

export const DeleteView = ({
  handleViewChange,
  uid,
}: import('./ProfileTile').Props) => {
  const { t } = useTranslation()
  const [save] = useMutation(SET_PROFILE, {
    refetchQueries: [ALL_PROFILES],
  })

  const profileNo = useWebhookStore(
    (s) => s.profile.find((p) => p.uid === uid)?.profile_no,
  )

  const handleRemove = () => {
    useWebhookStore.setState({ profileLoading: uid })
    save({
      variables: {
        category: 'profiles-byProfileNo',
        data: profileNo,
        status: 'DELETE',
      },
    }).then(handleUpdate)
  }

  return (
    <>
      <Grid sm={8} xs={6}>
        <Typography align="center" variant="subtitle2">
          {t('confirm_delete')}
        </Typography>
      </Grid>
      <Grid sm={2} xs={4}>
        <IconButton size="large" onClick={handleViewChange('profile')}>
          <Clear />
        </IconButton>
        <IconButton size="large" onClick={handleRemove}>
          <Save />
        </IconButton>
      </Grid>
    </>
  )
}
