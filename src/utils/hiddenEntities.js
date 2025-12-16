// @ts-check

const STORAGE_KEY = 'hidden-entities'
const SNACKBAR_COUNT_KEY = 'hidden-entities-snackbar-count'
const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
const MAX_SNACKBAR_SHOWS = 3

/**
 * @typedef {{ id: string | number, ts: number }} HiddenEntry
 */

/**
 * Load hidden entries from localStorage
 * @returns {HiddenEntry[]}
 */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Save hidden entries to localStorage
 * @param {HiddenEntry[]} entries
 */
function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage may be full or disabled
  }
}

/**
 * Clean entries older than 1 hour
 * @param {HiddenEntry[]} entries
 * @returns {HiddenEntry[]}
 */
function cleanOldEntries(entries) {
  const now = Date.now()
  return entries.filter((e) => now - e.ts < MAX_AGE_MS)
}

/**
 * Add an entity ID to the hidden list with timestamp
 * @param {string | number} id
 * @returns {Set<string | number>} Updated hideList Set
 */
export function addHiddenEntity(id) {
  const entries = loadEntries()
  if (!entries.some((e) => e.id === id)) {
    entries.push({ id, ts: Date.now() })
  }
  saveEntries(entries)
  return new Set(entries.map((e) => e.id))
}

/**
 * Get the current hidden entity Set from localStorage
 * @returns {Set<string | number>}
 */
export function getHiddenEntitySet() {
  const entries = loadEntries()
  return new Set(entries.map((e) => e.id))
}

/**
 * Clean outdated hidden entries (older than 1 hour) from localStorage
 * Updates both localStorage and the in-memory hideList
 * @param {(state: { hideList: Set<string | number> }) => void} setState
 */
export function cleanupHiddenEntities(setState) {
  const entries = loadEntries()
  const cleaned = cleanOldEntries(entries)
  if (cleaned.length !== entries.length) {
    saveEntries(cleaned)
    setState({ hideList: new Set(cleaned.map((e) => e.id)) })
  }
}

/** @type {{ current: number | null }} */
const snackbarTimer = { current: null }

/** @type {{ current: HTMLDivElement | null }} */
const snackbarRef = { current: null }

/**
 * Get snackbar show count from localStorage
 * @returns {number}
 */
function getSnackbarCount() {
  try {
    return parseInt(localStorage.getItem(SNACKBAR_COUNT_KEY) || '0', 10)
  } catch {
    return 0
  }
}

/**
 * Increment snackbar show count in localStorage
 */
function incrementSnackbarCount() {
  try {
    const count = getSnackbarCount() + 1
    localStorage.setItem(SNACKBAR_COUNT_KEY, String(count))
  } catch {
    // localStorage may be full or disabled
  }
}

/**
 * Show a temporary snackbar message for 2 seconds (max 3 times total)
 * @param {string} message
 */
export function showHideSnackbar(message) {
  if (getSnackbarCount() >= MAX_SNACKBAR_SHOWS) {
    return
  }

  if (snackbarTimer.current) {
    clearTimeout(snackbarTimer.current)
  }
  if (snackbarRef.current) {
    snackbarRef.current.remove()
  }

  incrementSnackbarCount()

  const snackbar = document.createElement('div')
  snackbar.textContent = message
  snackbar.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(50, 50, 50, 0.95);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
  `
  document.body.appendChild(snackbar)
  snackbarRef.current = snackbar

  snackbarTimer.current = window.setTimeout(() => {
    snackbar.remove()
    snackbarRef.current = null
    snackbarTimer.current = null
  }, 2000)
}

/**
 * Clear all hidden entities from localStorage
 */
export function clearHiddenEntities() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may be disabled
  }
}
