// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import { ProfileView } from './ProfileView'
import { EditView } from './EditView'
import { DeleteView } from './DeleteVIew'
import { CopyView } from './CopyView'

/**
 * @typedef {'profile' | 'edit' | 'delete' | 'copy'} View
 * @typedef {{ uid: number, handleViewChange: (newView: View) => () => void}} Props
 */

const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  width: '100%',
  height: 3,
}))

/** @param {Pick<Props, 'uid'>} props */
export const ProfileTile = ({ uid }) => {
  const [view, setView] = React.useState(/** @type {View} */ ('profile'))

  const handleViewChange = React.useCallback(
    (/** @type {View} */ newView) => () => setView(newView),
    [view],
  )
  return (
    <Grid container xs={12} justifyContent="center" alignItems="center">
      <StyledDivider flexItem />
      {
        {
          profile: (
            <ProfileView uid={uid} handleViewChange={handleViewChange} />
          ),
          edit: <EditView uid={uid} handleViewChange={handleViewChange} />,
          delete: <DeleteView uid={uid} handleViewChange={handleViewChange} />,
          copy: <CopyView uid={uid} handleViewChange={handleViewChange} />,
        }[view]
      }
    </Grid>
  )
}
