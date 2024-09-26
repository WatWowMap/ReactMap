import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import { styled } from '@mui/material/styles'

import { useWebhookStore } from '@store/useWebhookStore'

import { ProfileView } from './ProfileView'
import { EditView } from './EditView'
import { DeleteView } from './DeleteVIew'
import { CopyView } from './CopyView'

export type View = 'profile' | 'edit' | 'delete' | 'copy'

export type Props = {
  uid: number
  handleViewChange: (newView: View) => () => void
}

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  width: '100%',
  height: 3,
}))

export const ProfileTile = ({ uid }: Pick<Props, 'uid'>) => {
  const [view, setView] = React.useState(/** @type {View} */ 'profile')
  const isLoading = useWebhookStore((s) => s.profileLoading === uid)

  const handleViewChange = React.useCallback(
    (/** @type {View} */ newView: View) => () => setView(newView),
    [view],
  )
  return (
    <Grid container xs={12} justifyContent="center" alignItems="center">
      <StyledDivider flexItem />
      {isLoading ? (
        <CircularProgress />
      ) : (
        {
          profile: (
            <ProfileView uid={uid} handleViewChange={handleViewChange} />
          ),
          edit: <EditView uid={uid} handleViewChange={handleViewChange} />,
          delete: <DeleteView uid={uid} handleViewChange={handleViewChange} />,
          copy: <CopyView uid={uid} handleViewChange={handleViewChange} />,
        }[view]
      )}
    </Grid>
  )
}
