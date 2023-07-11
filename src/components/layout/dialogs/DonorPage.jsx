/* eslint-disable react/no-array-index-key */
import React from 'react'

import { useStatic } from '@hooks/useStore'

import DialogWrapper from '../custom/DialogWrapper'
import CustomTile from '../custom/CustomTile'

export default function DonorPage({ donorPage, handleDonorClose }) {
  const { perms } = useStatic((s) => s.auth)

  return (
    <DialogWrapper
      configObj={donorPage}
      defaultTitle="donor_page"
      handleClose={handleDonorClose}
    >
      {donorPage.components.map((block, i) => {
        if (block.donorOnly && !perms.donor) return null
        if (block.freeloaderOnly && perms.donor) return null
        return <CustomTile key={i} block={block} />
      })}
    </DialogWrapper>
  )
}
