/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { Grid, Divider } from '@material-ui/core'

import Utility from '@services/Utility'

import DiscordLogin from '../auth/Discord'
import CustomText from './CustomText'
import CustomButton from './CustomButton'
import CustomImg from './CustomImg'
import Telegram from '../auth/Telegram'

export default function Generator({ block = {}, defaultReturn = null }) {
  const isMuiColor = block.color === 'primary' || block.color === 'secondary'
  switch (block.type) {
    case 'img': return <CustomImg block={block} />
    case 'button': return <CustomButton block={block} isMuiColor={isMuiColor} />
    case 'text': return <CustomText block={block} isMuiColor={isMuiColor} />
    case 'divider': return <Divider {...block} />
    case 'telegram': return <Telegram botName={process.env?.[block.telegramBotEnvRef]} authUrl={block.telegramAuthUrl} />
    case 'discord': return <DiscordLogin href={block.link} text={block.text} />
    case 'parent': return (
      <Grid
        container
        item
        {...Utility.getSizes(block.gridSizes)}
        spacing={block.spacing}
        style={block.style}
        alignItems={block.alignItems}
        justifyContent={block.justifyContent}
      >
        {block.components.map((subBlock, i) => (
          <Grid
            key={i}
            item
            {...Utility.getSizes(subBlock.gridSizes)}
            style={subBlock.gridStyle || { textAlign: 'center' }}
          >
            <Generator block={subBlock} defaultReturn={defaultReturn} />
          </Grid>
        ))}
      </Grid>
    )
    default: return defaultReturn || null
  }
}
