/* eslint-disable react/no-array-index-key */
import React from 'react'
import { Typography } from '@material-ui/core'

import { useStatic } from '@hooks/useStore'

import CustomWrapper from '../custom/DialogWrapper'
import CustomTile from '../custom/CustomTile'

export default function Motd({ motd, handleMotdClose }) {
  const { perms } = useStatic(s => s.auth)

  return (
    <CustomWrapper
      configObj={motd}
      defaultTitle="message_of_the_day"
      handleClose={handleMotdClose}
      contentBody={
        motd.messages.map((block, i) => {
          if (block.donorOnly && !perms.donor) return null
          if (block.freeloaderOnly && perms.donor) return null
          return (
            <CustomTile
              key={i}
              block={block}
              defaultReturn={block.type ? null : <DefaultMotD block={block} />}
              childrenKey="messages"
            />
          )
        })
      }
    />
  )
}

const DefaultMotD = ({ block }) => typeof block === 'string' ? (
  <Typography key={block} variant="subtitle1" align="center" style={{ margin: 20 }}>
    {block}
  </Typography>
) : (
  <div key={`${block.title}-${block.body}`} style={{ whiteSpace: 'pre-line', margin: 20, textAlign: 'center' }}>
    {block.title && (
    <Typography variant="h6">
      {block.title}
    </Typography>
    )}
    {block.body && (
    <Typography variant="subtitle1">
      {block.body}
    </Typography>
    )}
    {block.footer && (
    <Typography variant="caption">
      {block.footer}
    </Typography>
    )}
  </div>
)
