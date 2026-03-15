// @ts-check

/**
 * Render a standard overlay icon wrapper for Leaflet markers.
 * @param {{
 *  url: string,
 *  size: number,
 *  bottom: number,
 *  left: number,
 *  opacity?: number,
 *  className?: string,
 *  alt?: string,
 * }} params
 */
export function renderOverlayIcon({
  url,
  size,
  bottom,
  left,
  opacity,
  className,
  alt = url,
}) {
  const classes = ['marker-overlay-icon', className].filter(Boolean).join(' ')
  const opacityStyle = typeof opacity === 'number' ? `opacity: ${opacity};` : ''

  return `
    <div
      class="${classes}"
      style="
        --marker-overlay-size: ${size}px;
        ${opacityStyle}
        bottom: ${bottom}px;
        left: ${left}%;
      "
    >
      <img
        src="${url}"
        alt="${alt}"
      />
    </div>
  `
}
