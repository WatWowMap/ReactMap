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

type ExtraProps = import('@rm/types').MarginProps &
  import('@rm/types').PaddingProps

type Props = ExtraProps & import('@mui/material').DividerProps

export const DividerWithMargin = styled(Divider, {
  shouldForwardProp: (prop) =>
    typeof prop !== 'string' || !SKIP_PROPS.has(prop),
})<Props>(
  ({ m = '10px 0', mr, ml, mt, mb, mx, my, p, pr, pl, pt, pb, px, py }) => ({
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
