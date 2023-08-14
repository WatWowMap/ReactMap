// @ts-check
import * as React from 'react'
import {
  Grid,
  Divider,
  Typography,
  Select,
  MenuItem,
  Switch,
} from '@mui/material'
import { useMutation } from '@apollo/client'
import { Trans, useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Query from '@services/Query'

import Location from '../Location'
import Areas from './area'
import {
  setData,
  setLocation,
  setSelectedAreas,
  useWebhookStore,
} from '../store'
import { ProfileSelect } from './ProfileSelect'
import { useGetWebhookData } from '../hooks'
import { EnableSwitch, MemoEnableSwitch } from './EnableSwitch'

const Human = () => {
  const { t } = useTranslation()

  const location = useStore((s) => s.location)

  const perms = useStatic((s) => s.auth.perms)
  const { data } = useGetWebhookData('human')

  // console.log(data)
  // const [syncWebhook, { data: newData }] = useMutation(
  //   Query.webhook('setHuman'),
  //   {
  //     fetchPolicy: 'no-cache',
  //   },
  // )

  // React.useEffect(() => {
  //   if (newData?.webhook) {
  //     const { latitude, longitude, area } = newData.webhook.human
  //     if (parseFloat(latitude) || parseFloat(longitude)) {
  //       setLocation([latitude, longitude])
  //     } else {
  //       setLocation(location)
  //     }
  //     setSelectedAreas(JSON.parse(area))

  // }
  // }, [newData])

  // const handleProfileChange = React.useCallback(
  //   (/** @type {import('@mui/material').SelectChangeEvent<number>} */ e) => {
  //     syncWebhook({
  //       variables: {
  //         category: 'switchProfile',
  //         data: e.target.value,
  //         status: 'POST',
  //         name: selectedWebhook,
  //       },
  //     })
  //   },
  //   [selectedWebhook],
  // )

  // console.log({ data })
  const multipleHooks = perms.webhooks.length > 1
  const gridSize = multipleHooks ? 2 : 3

  return (
    <Grid container justifyContent="flex-start" alignItems="center" spacing={2}>
      <Grid
        container
        item
        xs={12}
        justifyContent="flex-start"
        alignItems="center"
        spacing={2}
      >
        <Grid item xs={6} sm={gridSize}>
          <Typography variant="h6">{t('select_profile')}</Typography>
        </Grid>
        <Grid item xs={6} sm={gridSize} style={{ textAlign: 'center' }}>
          <ProfileSelect />
        </Grid>
        {/* {multipleHooks && (
          <>
            <Grid item xs={6} sm={gridSize}>
              <Typography variant="h6">{t('select_webhook')}</Typography>
            </Grid>
            <Grid item xs={6} sm={gridSize} style={{ textAlign: 'center' }}>
              <Select
                value={selectedWebhook}
                onChange={(e) =>
                  useStore.setState({ selectedWebhook: e.target.value })
                }
                style={{ minWidth: 100 }}
              >
                {perms.webhooks.map((webhook) => (
                  <MenuItem key={webhook} value={webhook}>
                    {webhook}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </>
        )} */}
        <Grid item xs={6} sm={gridSize}>
          <Typography variant="h6">{t('enabled')}</Typography>
        </Grid>
        <Grid item xs={6} sm={gridSize} style={{ textAlign: 'center' }}>
          <MemoEnableSwitch />
        </Grid>
        <Divider
          light
          flexItem
          style={{ height: 5, width: '100%', margin: '15px 0px' }}
        />
      </Grid>
      {/* <Location /> */}
      <Divider
        light
        flexItem
        style={{ height: 5, width: '100%', margin: '15px 0px' }}
      />
      {/* <Areas /> */}
    </Grid>
  )
}

export default Human

// const areEqual = (prev, next) => {
//   const prevSelected = prev.webhookData[prev.selectedWebhook]
//   const nextSelected = next.webhookData[next.selectedWebhook]
//   return (
//     prev.selectedWebhook === next.selectedWebhook &&
//     prevSelected.human.current_profile_no ===
//       nextSelected.human.current_profile_no &&
//     prevSelected.human.latitude === nextSelected.human.latitude &&
//     prevSelected.human.longitude === nextSelected.human.longitude &&
//     prevSelected.human.area === nextSelected.human.area &&
//     prev.addNew === next.addNew &&
//     prev.selectedAreas.length === next.selectedAreas.length &&
//     prev.isMobile === next.isMobile &&
//     prev.webhookLocation.join('') === next.webhookLocation.join('') &&
//     prev.webhookMode === next.webhookMode
//   )
// }

// export default memo(Human, areEqual)
