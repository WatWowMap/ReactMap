/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import Utility from '@services/Utility'

import DiscordLogin from '../auth/Discord'
import LocalLogin from '../auth/Local'
import Telegram from '../auth/Telegram'
import CustomText from './CustomText'
import CustomButton from './CustomButton'
import CustomImg from './CustomImg'
import LocaleSelection from '../general/LocaleSelection'
import LinkWrapper from './LinkWrapper'

export default function Generator({ block = {}, defaultReturn = null }) {
  const { content = null, ...props } = block
  const children = Utility.getBlockContent(content)
  switch (block.type) {
    case 'img':
      return (
        <LinkWrapper {...props}>
          <CustomImg {...props} />
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
      return <DiscordLogin href={block.link} text={block.text} />
    case 'localLogin':
      return <LocalLogin href={block.localAuthUrl} style={props.style} />
    case 'localeSelection':
      return <LocaleSelection />
    case 'parent':
      return (
        <Grid
          container
          {...Utility.getSizes(block.gridSizes)}
          spacing={block.spacing}
          style={block.style}
          sx={block.sx}
          alignItems={block.alignItems}
          justifyContent={block.justifyContent}
        >
          {block.components.map((subBlock, i) =>
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
                {...subBlock.gridStyle}
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
