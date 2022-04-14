import React from 'react'
import LinkWrapper from './LinkWrapper'

export default function CustomImg({ block }) {
  const img = <img src={block.src} style={block.style} alt={block.src} />
  return block.link ? <LinkWrapper block={block} element={img} /> : img
}
