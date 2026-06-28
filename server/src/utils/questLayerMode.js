// @ts-check
const config = require('@rm/config')

const QUEST_LAYER_MODE_DUAL = 'dual'
const QUEST_LAYER_MODE_WITH_AR = 'with_ar'
const QUEST_LAYER_MODE_WITHOUT_AR = 'without_ar'

const QUEST_LAYER_MODES = new Set([
  QUEST_LAYER_MODE_DUAL,
  QUEST_LAYER_MODE_WITH_AR,
  QUEST_LAYER_MODE_WITHOUT_AR,
])

/**
 * @param {unknown} mode
 * @returns {'dual' | 'with_ar' | 'without_ar'}
 */
function normalizeQuestLayerMode(mode) {
  return QUEST_LAYER_MODES.has(/** @type {string} */ (mode))
    ? /** @type {'dual' | 'with_ar' | 'without_ar'} */ (mode)
    : QUEST_LAYER_MODE_WITHOUT_AR
}

/**
 * @param {import('@rm/types').Config['map']} [mapConfig]
 * @returns {'dual' | 'with_ar' | 'without_ar'}
 */
function getQuestLayerMode(mapConfig = config.getSafe('map')) {
  return normalizeQuestLayerMode(mapConfig?.misc?.questLayerMode)
}

/**
 * @param {'dual' | 'with_ar' | 'without_ar'} [mode]
 * @returns {boolean}
 */
function isDualQuestLayerMode(mode = getQuestLayerMode()) {
  return mode === QUEST_LAYER_MODE_DUAL
}

/**
 * @param {{ isMad?: boolean, hasAltQuests?: boolean, hasLayerColumn?: boolean }} source
 * @returns {boolean}
 */
function hasDualQuestLayer(source) {
  return !!(source.hasAltQuests || (source.isMad && source.hasLayerColumn))
}

/**
 * @param {unknown} requestedLayer
 * @param {{ isMad?: boolean, hasAltQuests?: boolean, hasLayerColumn?: boolean }} source
 * @param {'dual' | 'with_ar' | 'without_ar'} [mode]
 * @returns {'both' | 'with_ar' | 'without_ar'}
 */
function resolveQuestLayerSelection(
  requestedLayer,
  source,
  mode = getQuestLayerMode(),
) {
  if (!isDualQuestLayerMode(mode)) {
    return hasDualQuestLayer(source) ? mode : 'both'
  }
  return requestedLayer === QUEST_LAYER_MODE_WITH_AR ||
    requestedLayer === QUEST_LAYER_MODE_WITHOUT_AR
    ? requestedLayer
    : 'both'
}

module.exports = {
  QUEST_LAYER_MODE_DUAL,
  QUEST_LAYER_MODE_WITH_AR,
  QUEST_LAYER_MODE_WITHOUT_AR,
  getQuestLayerMode,
  isDualQuestLayerMode,
  normalizeQuestLayerMode,
  resolveQuestLayerSelection,
}
