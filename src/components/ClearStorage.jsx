import React from 'react'
import { Redirect } from 'react-router-dom'

export default function ClearStorage() {
  localStorage.clear()
  sessionStorage.clear()
  return <Redirect push to="/" />
}
