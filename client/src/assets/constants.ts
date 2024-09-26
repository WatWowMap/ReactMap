// @ts-check

export const ICON_SIZES = ['sm', 'md', 'lg', 'xl'] as const

export const XXS_XXL = ['xxs', 'xxl'] as const

export const NUNDO_HUNDO = ['zeroIv', 'hundoIv'] as const

export const ENUM_GENDER = [0, 1, 2, 3] as const

export const ENUM_BADGES = [0, 1, 2, 3, 4] as const

export const S2_LEVELS = [
  ...(process.env.NODE_ENV === 'development'
    ? ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const)
    : ([] as const)),
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
] as const

export const FORT_LEVELS = ['all', '1', '2', '3'] as const

export const BADGES = [
  'all',
  'badge_1',
  'badge_2',
  'badge_3',
  'badge_4',
] as const

export const QUEST_SETS = ['with_ar', 'both', 'without_ar'] as const

export const WAYFARER_OPTIONS = [
  'rings',
  'includeSponsored',
  's14Cells',
  's17Cells',
] as const

export const ENUM_TTH = [0, 1, 2] as const

export const MIN_MAX = ['min', 'max'] as const

export const ENABLED_ALL = ['enabled', 'all'] as const

export const RADIUS_CHOICES = ['pokemon', 'gym'] as const

export const METHODS = ['discord', 'telegram'] as const

export const FILTER_SKIP_LIST = ['filter', 'enabled', 'legacy']

export const ALWAYS_EXCLUDED = new Set(['donor', 'blockedGuildNames', 'admin'])

export const SCAN_MODES = ['confirmed', 'loading', 'error'] as const

export const SCAN_SIZES = ['S', 'M', 'XL'] as const
