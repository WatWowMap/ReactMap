import React from 'react'
import { Typography } from '@material-ui/core'

import Utility from '../../../services/Utility'

export default function Title({ name }) {
  return (
    <Typography>{Utility.getProperName(name)}</Typography>
  )
}
