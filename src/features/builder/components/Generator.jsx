/* eslint-disable react/no-array-index-key */
import React from 'react'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'

import Utility from '@services/Utility'
import DiscordButton from '@components/auth/Discord'
import LocalLogin from '@components/auth/Local'
import Telegram from '@components/auth/Telegram'
import { Img } from '@components/Img'
import { LocaleSelection } from '@components/inputs/LocaleSelection'

import { LinkWrapper } from './LinkWrapper'
import { CustomText } from './CustomText'
import { CustomButton } from './CustomButton'

/**
 *
 * @param {{ block: import('@rm/types').CustomComponent, defaultReturn: React.ReactNode }} props
 * @returns
 */
export function Generator({ block, defaultReturn = null }) {
  const { content = null, text = null, gridSizes, type, ...props } = block
  const children = Utility.getBlockContent(content || text)
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
          {...Utility.getSizes(gridSizes)}
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
