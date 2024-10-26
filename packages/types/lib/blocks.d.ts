import type {
  ButtonProps,
  DialogProps,
  DividerProps,
  Grid2Props,
  SxProps,
  TypographyProps,
} from '@mui/material'

interface BaseBlock {
  gridSizes?: GridSizes
  gridStyle?: React.CSSProperties
  gridSx?: SxProps
  donorOnly?: boolean
  freeloaderOnly?: boolean
  loggedInOnly?: boolean
  loggedOutOnly?: boolean
  text?: string | null
  content?: string | null
  link?: string | null
  href?: string | null
}

interface CustomText
  extends Omit<OnlyType<TypographyProps, Function, false>>,
    BaseBlock {
  type: 'text'
}

interface CustomDivider
  extends Omit<OnlyDType<DividerProps, Function, false>>,
    BaseBlock {
  type: 'divider'
}

interface CustomButton
  extends Omit<OnlyType<ButtonProps, Function, false>>,
    BaseBlock {
  type: 'button'
}

interface CustomImg extends ImgProps, BaseBlock {
  type: 'img'
}

interface CustomDiscord extends BaseBlock {
  type: 'discord'
  link: string
}

interface CustomTelegram extends BaseBlock {
  type: 'telegram'
  telegramBotName: string
  telegramAuthUrl: string
}

interface CustomLocal extends BaseBlock {
  type: 'localLogin'
  localAuthUrl: string
  link: string
  style: React.CSSProperties
}

interface CustomLocale extends BaseBlock {
  type: 'localeSelection'
}

interface ParentBlock extends BaseBlock, Grid2Props {
  type: 'parent'
  components: CustomComponent[]
}

export type CustomComponent =
  | CustomText
  | CustomDivider
  | CustomButton
  | CustomImg
  | CustomDiscord
  | CustomTelegram
  | CustomLocal
  | CustomLocale
  | ParentBlock
