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
    <Grid container alignItems="center" justifyContent="center" xs={12}>
      <StyledDivider flexItem />
      {isLoading ? (
        <CircularProgress />
      ) : (
        {
          profile: (
            <ProfileView handleViewChange={handleViewChange} uid={uid} />
          ),
          edit: <EditView handleViewChange={handleViewChange} uid={uid} />,
          delete: <DeleteView handleViewChange={handleViewChange} uid={uid} />,
          copy: <CopyView handleViewChange={handleViewChange} uid={uid} />,
        }[view]
      )}
    </Grid>
  )
}
