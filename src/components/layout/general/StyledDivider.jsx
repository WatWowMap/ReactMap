// @ts-check
import { styled } from '@mui/material/styles'
import Divider from '@mui/material/Divider'

const SKIP_PROPS = new Set([
  'm',
  'mt',
  'mb',
  'ml',
  'mr',
  'mx',
  'my',
  'p',
  'pt',
  'pb',
  'pl',
  'pr',
  'px',
  'py',
])

/**
 * @typedef {import('packages/types/lib').MarginProps & import('packages/types/lib').PaddingProps} ExtraProps
 * @typedef {ExtraProps & import('@mui/material').DividerProps} Props
 * @typedef {Props & { theme: import('@mui/material').Theme}} DividerStyleProps
 *
 * @type {import('react').FC<Props>}
 */
export const DividerWithMargin = styled(Divider, {
  shouldForwardProp: (prop) =>
    typeof prop !== 'string' || !SKIP_PROPS.has(prop),
})(
  (
    /** @type {DividerStyleProps} */ {
      m = '10px 0',
      mr,
      ml,
      mt,
      mb,
      mx,
      my,
      p,
      pr,
      pl,
      pt,
      pb,
      px,
      py,
    },
  ) => ({
    m,
    mr,
    ml,
    mt,
    mb,
    mx,
    my,
    p,
    pr,
    pl,
    pt,
    pb,
    px,
    py,
  }),
)
