import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ClearStorage() {
  localStorage.clear()
  sessionStorage.clear()
  return <Navigate push to="/" />
}
