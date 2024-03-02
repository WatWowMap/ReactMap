/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import Utility from '@services/Utility'

import DiscordButton from '../auth/Discord'
import LocalLogin from '../auth/Local'
import Telegram from '../auth/Telegram'
import CustomText from './CustomText'
import CustomButton from './CustomButton'
import { Img } from '../Img'
import LocaleSelection from '../LocaleSelection'
import LinkWrapper from './LinkWrapper'

export default function Generator({ block = {}, defaultReturn = null }) {
  // eslint-disable-next-line no-unused-vars
  const { content = null, text = null, gridSizes, ...props } = block
  const children = Utility.getBlockContent(content || text)
  switch (block.type) {
    case 'img':
      return (
        <LinkWrapper {...props}>
          <Img {...props} />
        </LinkWrapper>
      )
    case 'button':
      return (
        <LinkWrapper {...props}>
          <CustomButton {...props}>{children}</CustomButton>
        </LinkWrapper>
      )
    case 'text':
      return (
        <LinkWrapper {...props}>
          <CustomText {...props}>{children}</CustomText>
        </LinkWrapper>
      )
    case 'divider':
      return <Divider {...props} />
    case 'telegram':
      return (
        <Telegram
          botName={block.telegramBotName}
          authUrl={block.telegramAuthUrl}
        />
      )
    case 'discord':
      return <DiscordButton href={block.link}>{children}</DiscordButton>
    case 'localLogin':
      return (
        <LocalLogin
          href={block.localAuthUrl || block.link}
          style={props.style}
        />
      )
    case 'localeSelection':
      return <LocaleSelection />
    case 'parent':
      return (
        <Grid
          container
          {...Utility.getSizes(block.gridSizes)}
          className={block.className}
          alignItems={block.alignItems}
          justifyContent={block.justifyContent}
          spacing={block.spacing}
          style={block.style}
          sx={block.sx}
        >
          {(Array.isArray(block.components) ? block.components : []).map(
            (subBlock, i) =>
              subBlock.type === 'parent' ? (
                <Generator
                  key={i}
                  block={subBlock}
                  defaultReturn={defaultReturn}
                />
              ) : (
                <Grid
                  key={i}
                  {...Utility.getSizes(subBlock.gridSizes)}
                  className={block.className}
                  style={subBlock.gridStyle}
                  sx={subBlock.gridSx}
                >
                  <Generator
                    key={i}
                    block={subBlock}
                    defaultReturn={defaultReturn}
                  />
                </Grid>
              ),
          )}
        </Grid>
      )
    default:
      return defaultReturn || null
  }
}
