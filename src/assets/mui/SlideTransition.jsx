import React from 'react'
import { Slide } from '@mui/material'

export default function SlideTransition(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Slide {...props} direction="up" />
}
