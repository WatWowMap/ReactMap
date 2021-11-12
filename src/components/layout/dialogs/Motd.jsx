/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import {
  DialogContent, Typography, Grid, Button, Link, Divider,
} from '@material-ui/core'
import { Link as RouterLink } from 'react-router-dom'

import { useStatic } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function Motd({ motd, handleMotdClose }) {
  const { perms } = useStatic(s => s.auth)

  const getSizes = (sizeObj) => ({
    xs: sizeObj?.xs || 12,
    sm: sizeObj?.sm || sizeObj?.xs || 12,
    md: sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    lg: sizeObj?.lg || sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
    xl: sizeObj?.xl || sizeObj?.lg || sizeObj?.md || sizeObj?.sm || sizeObj?.xs || 12,
  })

  const getLinkWrapper = (block, element) => (
    block.link.startsWith('http') ? (
      <Link
        href={block.link}
        rel="noreferrer"
        target="blank"
        color={block.linkColor}
        underline={block.underline}
      >
        {element}
      </Link>
    ) : (
      <RouterLink
        to={block.link}
        style={block.style}
      >
        {element}
      </RouterLink>
    )
  )

  const getContent = (block) => {
    const isMuiColor = block.color === 'primary' || block.color === 'secondary'
    switch (block.type) {
      case 'img': {
        const img = <img src={block.src} style={block.style} />
        return block.link ? getLinkWrapper(block, img) : img
      }
      case 'button': {
        const button = (
          <Button
            size={block.size}
            color={isMuiColor ? block.color : 'inherit'}
            variant={block.variant}
            style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
          >
            {block.content}
          </Button>
        )
        return block.link ? getLinkWrapper(block, button) : button
      }
      case 'text': {
        const text = (
          <Typography
            variant={block.variant}
            color={isMuiColor ? block.color : 'inherit'}
            style={block.style || { color: isMuiColor ? 'inherit' : block.color }}
          >
            {block.content}
          </Typography>
        )
        return block.link ? getLinkWrapper(block, text) : text
      }
      case 'divider': return (
        <Divider {...block} />
      )
      case 'parent': return (
        <Grid
          container
          item
          {...getSizes(block.gridSizes)}
          spacing={block.spacing}
          style={block.style}
          alignItems={block.alignItems}
          justifyContent={block.justifyContent}
        >
          {block.messages.map((subMessages, i) => (
            <Grid
              key={i}
              item
              {...getSizes(subMessages.sizes)}
              style={subMessages.gridStyle || { textAlign: 'center' }}
            >
              {getContent(subMessages)}
            </Grid>
          ))}
        </Grid>
      )
      default: return typeof block === 'string' ? (
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
    }
  }

  const footerOptions = [{ name: 'close', action: handleMotdClose, color: 'primary' }]

  if (motd.footerButtons.length) {
    footerOptions.unshift(...motd.footerButtons.filter(button => (
      !button.donorOnly && !button.freeloaderOnly)
      || (button.donorOnly && perms.donor)
      || (button.freeloaderOnly && !perms.donor)))
  }

  return (
    <>
      <Header titles={motd.titles || ['messageOfTheDay']} />
      <DialogContent>
        <Grid
          container
          spacing={motd.settings.parentSpacing}
          alignItems={motd.settings.parentAlignItems}
          justifyContent={motd.settings.parentJustifyContent}
          style={motd.settings.parentStyle}
        >
          {motd.messages.map((block, i) => {
            if (block.donorOnly && !perms.donor) return null
            if (block.freeloaderOnly && perms.donor) return null
            return (
              <Grid
                key={i}
                item
                {...getSizes(block.gridSizes)}
                style={block.gridStyle || { textAlign: 'center' }}
              >
                {getContent(block)}
              </Grid>
            )
          })}
        </Grid>
      </DialogContent>
      <Footer options={footerOptions} />
    </>
  )
}
