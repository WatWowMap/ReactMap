/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { Grid, Divider } from '@material-ui/core'

import Utility from '@services/Utility'

import DiscordLogin from '../auth/Discord'
import LocalLogin from '../auth/Local'
import Telegram from '../auth/Telegram'
import CustomText from './CustomText'
import CustomButton from './CustomButton'
import CustomImg from './CustomImg'
import LocaleSelection from '../general/LocaleSelection'

export default function Generator({
  block = {},
  defaultReturn = null,
  serverSettings,
}) {
  const isMuiColor = block.color === 'primary' || block.color === 'secondary'
  switch (block.type) {
    case 'img':
      return <CustomImg block={block} />
    case 'button':
      return <CustomButton block={block} isMuiColor={isMuiColor} />
    case 'text':
      return <CustomText block={block} isMuiColor={isMuiColor} />
    case 'divider':
      return <Divider {...block} />
    case 'telegram':
      return (
        <Telegram
          botName={block.telegramBotName}
          authUrl={block.telegramAuthUrl}
        />
      )
    case 'discord':
      return <DiscordLogin href={block.link} text={block.text} />
    case 'localLogin':
      return (
        <LocalLogin href={block.localAuthUrl} serverSettings={serverSettings} />
      )
    case 'localeSelection':
      return (
        <LocaleSelection
          localeSelection={serverSettings.config.localeSelection}
        />
      )
    case 'parent':
      return (
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
              <Generator
                block={subBlock}
                defaultReturn={defaultReturn}
                serverSettings={serverSettings}
              />
            </Grid>
          ))}
        </Grid>
      )
    default:
      return defaultReturn || null
  }
}
