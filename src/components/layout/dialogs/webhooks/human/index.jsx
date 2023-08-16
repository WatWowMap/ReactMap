// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'
import { WEBHOOK_CHANGE } from '@services/queries/webhook'
import { Loading } from '@components/layout/general/Loading'

import Location from './Location'
import Areas from './area'
import { ProfileSelect } from './ProfileSelect'
import { useGetWebhookData } from '../hooks'
import { EnableSwitch } from './EnableSwitch'
import { useWebhookStore } from '../store'

const Human = () => {
  const { t } = useTranslation()
  return (
    <Grid container justifyContent="flex-start" alignItems="center" spacing={2}>
      <Grid container xs={12} justifyContent="flex-start" alignItems="center">
        <Grid xs={6} sm={2}>
          <Typography variant="h6">{t('select_profile')}</Typography>
        </Grid>
        <Grid xs={6} sm={2} textAlign="center">
          <ProfileSelect />
        </Grid>
        <HookSelection />
        <Grid xs={6} sm={2}>
          <Typography variant="h6">{t('enabled')}</Typography>
        </Grid>
        <Grid xs={6} sm={2} textAlign="center">
          <EnableSwitch />
        </Grid>
        <Divider
          light
          flexItem
          sx={{ height: 5, width: '100%', margin: '15px 0px' }}
        />
      </Grid>
      <Location />
      <Divider
        light
        flexItem
        sx={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
      <Areas />
    </Grid>
  )
}

function HookSelection() {
  const { t } = useTranslation()

  const {
    data: { selected, webhooks },
    loading,
  } = useGetWebhookData('human')

  const [save] = useMutation(WEBHOOK_CHANGE, {
    refetchQueries: [
      'Webhook',
      'WebhookUser',
      'WebhookCategories',
      'WebhookAreas',
      'WebhookContext',
    ],
    fetchPolicy: 'no-cache',
  })

  return loading ? (
    <Loading>{t('loading', { category: t('webhooks') })}</Loading>
  ) : (
    <>
      <Grid xs={6} sm={2}>
        <Typography variant="h6">{t('select_webhook')}</Typography>
      </Grid>
      <Grid xs={6} sm={2} textAlign="center">
        <Select
          value={selected}
          onChange={(e) => {
            save({ variables: { webhook: e.target.value } }).then(
              ({ data }) =>
                data?.webhook?.human &&
                useWebhookStore.setState({ human: data.webhook.human }),
            )
          }}
          style={{ minWidth: 100 }}
        >
          {webhooks.map((webhook) => (
            <MenuItem key={webhook} value={webhook}>
              {webhook}
            </MenuItem>
          ))}
        </Select>
      </Grid>
    </>
  )
}
export default Human
