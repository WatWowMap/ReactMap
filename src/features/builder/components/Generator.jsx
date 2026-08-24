// @ts-check
/* eslint-disable react/no-array-index-key */

import { DiscordButton } from '@components/auth/Discord'
import { LocalLogin } from '@components/auth/Local'
import { TelegramWidget } from '@components/auth/Telegram'
import { Img } from '@components/Img'
import { LocaleSelection } from '@components/inputs/LocaleSelection'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import React from 'react'
import { getBlockContent, getGridSizes } from '../utils'
import { CustomButton } from './CustomButton'
import { CustomText } from './CustomText'
import { LinkWrapper } from './LinkWrapper'

/**
 *
 * @param {{ block: import('@rm/types').CustomComponent, defaultReturn: React.ReactNode }} props
 * @returns
 */
export function Generator({ block, defaultReturn = null }) {
  const { content = null, text = null, gridSizes, type, ...props } = block
  const children = getBlockContent(content || text)
  switch (type) {
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
        <TelegramWidget
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
          {...getGridSizes(gridSizes)}
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
                  // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
                  key={i}
                  block={subBlock}
                  defaultReturn={defaultReturn}
                />
              ) : (
                <Grid
                  // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
                  key={i}
                  {...getGridSizes(subBlock.gridSizes)}
                  className={block.className}
                  style={subBlock.gridStyle}
                  sx={subBlock.gridSx}
                >
                  <Generator
                    // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
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
