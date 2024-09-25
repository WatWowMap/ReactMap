// @ts-check

export const ICON_SIZES = /** @type {const} */ (['sm', 'md', 'lg', 'xl'])

export const XXS_XXL = /** @type {const} */ (['xxs', 'xxl'])

export const NUNDO_HUNDO = /** @type {const} */ (['zeroIv', 'hundoIv'])

export const ENUM_GENDER = /** @type {const} */ ([0, 1, 2, 3])

export const ENUM_BADGES = /** @type {const} */ ([0, 1, 2, 3, 4])

export const S2_LEVELS = /** @type {const} */ ([
  ...(process.env.NODE_ENV === 'development'
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
    : []),
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
])

export const FORT_LEVELS = /** @type {const} */ (['all', '1', '2', '3'])

export const BADGES = /** @type {const} */ ([
  'all',
  'badge_1',
  'badge_2',
  'badge_3',
  'badge_4',
])

export const QUEST_SETS = /** @type {const} */ ([
  'with_ar',
  'both',
  'without_ar',
])

export const WAYFARER_OPTIONS = /** @type {const} */ ([
  'rings',
  'includeSponsored',
  's14Cells',
  's17Cells',
])

export const ENUM_TTH = /** @type {const} */ ([0, 1, 2])

export const MIN_MAX = /** @type {const} */ (['min', 'max'])

export const ENABLED_ALL = /** @type {const} */ (['enabled', 'all'])

export const RADIUS_CHOICES = /** @type {const} */ (['pokemon', 'gym'])

export const METHODS = /** @type {const} */ (['discord', 'telegram'])

export const FILTER_SKIP_LIST = ['filter', 'enabled', 'legacy']

export const ALWAYS_EXCLUDED = new Set(['donor', 'blockedGuildNames', 'admin'])

export const SCAN_MODES = ['confirmed', 'loading', 'error']

export const SCAN_SIZES = /** @type {const} */ (['S', 'M', 'XL'])
