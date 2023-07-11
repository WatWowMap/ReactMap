/* eslint-disable react/no-array-index-key */
import React from 'react'
import { Typography } from '@material-ui/core'

import Utility from '@services/Utility'

import DialogWrapper from '../custom/DialogWrapper'
import CustomTile from '../custom/CustomTile'

export default function Motd({ motd, perms, handleMotdClose }) {
  return (
    <DialogWrapper
      configObj={motd}
      defaultTitle="message_of_the_day"
      handleClose={handleMotdClose}
    >
      {motd.components.map((block, i) => {
        if (block.donorOnly && !perms.donor) return null
        if (block.freeloaderOnly && perms.donor) return null
        return (
          <CustomTile
            key={i}
            block={block}
            defaultReturn={block.type ? null : <DefaultMotD block={block} />}
          />
        )
      })}
    </DialogWrapper>
  )
}

const DefaultMotD = ({ block }) =>
  typeof block === 'string' ? (
    <Typography
      key={block}
      variant="subtitle1"
      align="center"
      style={{ margin: 20 }}
    >
      {block}
    </Typography>
  ) : (
    <div
      key={`${block.title}-${block.body}`}
      style={{ whiteSpace: 'pre-line', margin: 20, textAlign: 'center' }}
    >
      {block.title && (
        <Typography variant="h6">
          {Utility.getBlockContent(block.title)}
        </Typography>
      )}
      {block.body && (
        <Typography variant="subtitle1">
          {Utility.getBlockContent(block.body)}
        </Typography>
      )}
      {block.footer && (
        <Typography variant="caption">
          {Utility.getBlockContent(block.footer)}
        </Typography>
      )}
    </div>
  )
