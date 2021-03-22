import { Typography } from '@material-ui/core';
import { ThemeProvider } from '@material-ui/styles';
import React from 'react'
import theme from '../layout/theme';

const SubmissionCellPopup = ({ cell }) => {
  return (
    <ThemeProvider theme={theme}>
      <Typography>
        {cell.level}
      </Typography>
      <Typography>
        {cell.id}
      </Typography>
      <Typography>
        {cell.count}
      </Typography>
      <Typography>
        {cell.count_pokestops}
      </Typography>
      <Typography>
        {cell.count_gyms}
      </Typography>

    </ThemeProvider>
  )
}

export default SubmissionCellPopup
