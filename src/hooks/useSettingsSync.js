// @ts-check
import * as React from 'react'
import { useApolloClient } from '@apollo/client'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useMapStore } from '@store/useMapStore'
import { Query } from '@services/queries'
import { deepMerge } from '@utils/deepMerge'

/** Settings that belong to this browser/device and are never synced */
const LOCAL_ONLY = new Set([
  'darkMode',
  'sidebar',
  'expanded',
  'tabs',
  'search',
  'searchTab',
  'scanAreasMenu',
  'desktopNotifications',
  'profiling',
  'stateTraceLog',
])

export const SETTINGS_SYNC_KEY = 'settings-sync'
const PUSH_DELAY = 5_000
/** Moving the map alone is saved at most this often */
const POSITION_DELAY = 60_000
const POSITION_KEYS = new Set(['location', 'zoom'])

/** The signed in account, so another account's sync state is not reused */
function getAccount() {
  const { username, discordId, telegramId } = useMemory.getState().auth
  return `${username}|${discordId}|${telegramId}`
}

/**
 * `takeOver`: the settings here replace the synced ones even if those are
 * newer (set by loading a backup or a full reset); otherwise newer settings
 * on the server win
 * @returns {{ rev: number, dirty: boolean, takeOver?: boolean }}
 */
export function getSyncMeta() {
  try {
    const meta = JSON.parse(localStorage.getItem(SETTINGS_SYNC_KEY) || '{}')
    // meta from before accounts were stored is taken as this account's
    if (meta?.account !== undefined && meta.account !== getAccount()) {
      return { rev: 0, dirty: false }
    }
    return {
      rev: Number(meta?.rev) || 0,
      dirty: !!meta?.dirty,
      takeOver: !!meta?.takeOver,
    }
  } catch (e) {
    return { rev: 0, dirty: false }
  }
}

/** @param {{ rev: number, dirty: boolean, takeOver?: boolean }} meta */
export function setSyncMeta(meta) {
  try {
    localStorage.setItem(
      SETTINGS_SYNC_KEY,
      JSON.stringify({ ...meta, account: getAccount() }),
    )
  } catch (e) {
    // storage blocked, sync just restarts from the server next time
  }
}

/** decode(): the synced settings can't be read in this browser */
const UNREADABLE_HERE = Symbol('unreadable here')

// set while the page reloads with other settings (a loaded backup), so a
// save due in the meantime can't send the old ones or mark them as saved
let paused = false
/** this browser can't read the synced settings, it stays out of the sync */
let optedOut = false

/** Stops saving until the page is reloaded */
export function pauseSync() {
  paused = true
}

/** Saves again after pauseSync, when the reload didn't happen */
export function resumeSync() {
  // a browser that can't read the synced settings stays out
  paused = optedOut
}

/**
 * Marks the stored sync state to be saved, without looking at whose it is,
 * for changes made where the account isn't known (the data page, /reset)
 * @param {boolean} [takeOver] the settings here replace newer synced ones
 */
export function markSyncDirty(takeOver = false) {
  try {
    const meta = JSON.parse(localStorage.getItem(SETTINGS_SYNC_KEY) || 'null')
    if (meta && typeof meta === 'object') {
      localStorage.setItem(
        SETTINGS_SYNC_KEY,
        JSON.stringify({
          ...meta,
          dirty: true,
          ...(takeOver ? { takeOver: true } : {}),
        }),
      )
    }
  } catch (e) {
    // storage blocked, nothing to keep
  }
}

/** @param {unknown} item @returns {item is Record<string, any>} */
const isObject = (item) =>
  !!item && typeof item === 'object' && !Array.isArray(item)

/**
 * The parts of `value` that differ from `base`, undefined when equal
 * @param {unknown} value
 * @param {unknown} base
 * @returns {unknown}
 */
function diff(value, base) {
  if (isObject(value) && isObject(base)) {
    const changed = {}
    Object.entries(value).forEach(([key, child]) => {
      const childDiff = diff(child, base[key])
      if (childDiff !== undefined) changed[key] = childDiff
    })
    return Object.keys(changed).length ? changed : undefined
  }
  return JSON.stringify(value) === JSON.stringify(base) ? undefined : value
}

/**
 * The settings to sync. Filters only hold what differs from the server's
 * default filters, which keeps the payload a few KB instead of a MB.
 * @returns {Record<string, unknown>}
 */
function syncedState() {
  const state = Object.fromEntries(
    Object.entries(useStorage.getState()).filter(
      ([key, value]) => typeof value !== 'function' && !LOCAL_ONLY.has(key),
    ),
  )
  state.filters = diff(state.filters, useMemory.getState().filters) || {}
  return state
}

/** @param {Uint8Array} bytes */
const toBase64 = (bytes) => {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/**
 * @param {string} json
 * @returns {Promise<{ v: 2, z?: string, raw?: Record<string, unknown> }>}
 */
async function encode(json) {
  if (typeof CompressionStream === 'undefined') {
    return { v: 2, raw: JSON.parse(json) }
  }
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  return {
    v: 2,
    z: toBase64(new Uint8Array(await new Response(stream).arrayBuffer())),
  }
}

/**
 * @param {unknown} data
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function decode(data) {
  if (!isObject(data) || data.v !== 2) return null
  if (isObject(data.raw)) return data.raw
  if (typeof data.z !== 'string') return null
  // readable, just not in this browser (no gzip support): it must not take
  // over the settings it can't read
  if (typeof DecompressionStream === 'undefined') return UNREADABLE_HERE
  const bytes = Uint8Array.from(atob(data.z), (c) => c.charCodeAt(0))
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return JSON.parse(await new Response(stream).text())
}

/**
 * Keeps a logged in user's settings in sync between browsers: changes are
 * saved to the server, and newer settings from the server are loaded when the
 * map is opened or the tab becomes visible again. Last save wins.
 */
export function useSettingsSync() {
  const client = useApolloClient()
  const enabled = useMemory(
    (s) =>
      !!s.auth.loggedIn &&
      !!s.auth.perms?.backups &&
      // the server's default filters are needed to diff against
      Object.keys(s.filters || {}).length > 0,
  )

  React.useEffect(() => {
    if (!enabled) return undefined
    let timer = 0
    let dueAt = 0
    let busy = false
    let applying = false
    let lastSynced = ''
    // opened from a link to a place (an alert): the first synced settings
    // don't move the map away from it
    let keepPosition = /^\/(@|id)\//.test(window.location.pathname)
    // the server revision this tab's settings are based on; the one in
    // storage is shared with other tabs of the browser that may be ahead
    let appliedRev = getSyncMeta().rev

    /** @param {number} [delay] an earlier pending save is kept */
    const schedule = (delay = PUSH_DELAY) => {
      const due = Date.now() + delay
      if (timer && dueAt <= due) return
      window.clearTimeout(timer)
      dueAt = due
      timer = window.setTimeout(push, delay)
    }

    /** @param {number} rev @param {Record<string, any>} data */
    const apply = (rev, data) => {
      // the page is reloading with other settings (a loaded backup)
      if (paused) return
      const prev = useStorage.getState()
      const next = Object.fromEntries(
        Object.entries(data).filter(
          ([key]) => !LOCAL_ONLY.has(key) && typeof prev[key] !== 'function',
        ),
      )
      // settings saved before the server added an option still get it
      const defaults = useMemory.getState()
      next.filters = deepMerge(
        {},
        structuredClone(defaults.filters),
        isObject(data.filters) ? data.filters : {},
      )
      ;['userSettings', 'menus'].forEach((key) => {
        if (isObject(data[key]) && isObject(defaults[key])) {
          next[key] = deepMerge({}, structuredClone(defaults[key]), data[key])
        }
      })
      const keptPosition = keepPosition
      keepPosition = false
      if (keptPosition) {
        delete next.location
        delete next.zoom
      }
      applying = true
      try {
        useStorage.setState(next)
      } finally {
        applying = false
      }
      lastSynced = JSON.stringify(syncedState())
      appliedRev = rev
      setSyncMeta({ rev, dirty: false })
      const { location, zoom } = useStorage.getState()
      const { map } = useMapStore.getState()
      if (
        !keptPosition &&
        map &&
        Array.isArray(location) &&
        isObject(data) &&
        data.location
      ) {
        // the map stores where it actually ended up, which can differ a
        // little: that counts as synced, not as a change to save again
        map.once('moveend', () => {
          if (!paused) lastSynced = JSON.stringify(syncedState())
        })
        map.setView(location, zoom)
      }
    }

    const pull = async () => {
      const { data } = await client.query({
        query: Query.user('GET_SETTINGS_SYNC'),
        variables: { withData: true },
        fetchPolicy: 'no-cache',
      })
      const remote = data?.settingsSync
      const settings = remote?.rev ? await decode(remote.data) : null
      if (paused) return
      if (settings === UNREADABLE_HERE) {
        // this browser can't take part, it stays out of the sync
        optedOut = true
        paused = true
        // eslint-disable-next-line no-console
        console.warn('[settingsSync] not supported in this browser')
      } else if (settings) {
        apply(remote.rev, settings)
      } else if (remote) {
        // unreadable (old format), this browser takes over
        appliedRev = remote.rev
        setSyncMeta({ rev: remote.rev, dirty: true })
        lastSynced = ''
        schedule(0)
      }
    }

    async function push() {
      timer = 0
      if (paused) return undefined
      if (busy) return schedule()
      const json = JSON.stringify(syncedState())
      const meta = getSyncMeta()
      if (json === lastSynced) {
        if (meta.dirty) setSyncMeta({ ...meta, dirty: false })
        return undefined
      }
      busy = true
      try {
        const { data } = await client.mutate({
          mutation: Query.user('SET_SETTINGS_SYNC'),
          variables: { data: await encode(json), baseRev: appliedRev },
          fetchPolicy: 'no-cache',
        })
        if (paused) return undefined
        const result = data?.setSettingsSync
        if (result?.conflict) {
          if (getSyncMeta().takeOver) {
            // a loaded backup or a reset: saved over the newer settings
            busy = false
            await check()
          } else {
            // another device saved newer settings, those win
            await pull()
          }
        } else if (result?.rev) {
          lastSynced = json
          appliedRev = result.rev
          setSyncMeta({ rev: result.rev, dirty: !!timer })
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[settingsSync] save failed', e)
      } finally {
        busy = false
      }
      return undefined
    }

    const check = async () => {
      if (busy) return
      busy = true
      try {
        const { data } = await client.query({
          query: Query.user('GET_SETTINGS_SYNC'),
          variables: { withData: false },
          fetchPolicy: 'no-cache',
        })
        const remote = data?.settingsSync
        if (!remote || paused) return
        const meta = getSyncMeta()
        if (remote.rev > appliedRev && meta.takeOver) {
          // a loaded backup or a reset replaces the newer synced settings
          appliedRev = remote.rev
          setSyncMeta({ rev: remote.rev, dirty: true, takeOver: true })
          lastSynced = ''
          schedule(0)
        } else if (remote.rev > appliedRev) {
          await pull()
        } else if (remote.rev < appliedRev || !remote.rev) {
          // nothing (or something older) on the server, this browser leads
          appliedRev = remote.rev
          setSyncMeta({ rev: remote.rev, dirty: true })
          schedule(0)
        } else if (meta.dirty) {
          schedule(0)
        } else {
          lastSynced = JSON.stringify(syncedState())
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[settingsSync] check failed', e)
      } finally {
        busy = false
        // only the first check after opening a link keeps its place
        keepPosition = false
      }
    }

    /**
     * The synced settings (not the map position) by key, as last seen: some
     * setters change the previous state object in place, so the old state
     * can't be compared, but every change puts a new object at its key
     * @returns {Record<string, unknown>}
     */
    const settingRefs = () =>
      Object.fromEntries(
        Object.entries(useStorage.getState()).filter(
          ([key, value]) =>
            typeof value !== 'function' &&
            !LOCAL_ONLY.has(key) &&
            !POSITION_KEYS.has(key),
        ),
      )
    let lastRefs = settingRefs()

    const unsubscribe = useStorage.subscribe(() => {
      if (applying || paused) return
      const meta = getSyncMeta()
      // the revision this tab's settings are based on goes with them
      if (!meta.dirty || meta.rev !== appliedRev) {
        setSyncMeta({ ...meta, rev: appliedRev, dirty: true })
      }
      const refs = settingRefs()
      const positionOnly = Object.keys(refs).every(
        (key) => refs[key] === lastRefs[key],
      )
      lastRefs = refs
      schedule(positionOnly ? POSITION_DELAY : PUSH_DELAY)
    })

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        check()
      } else if (timer) {
        window.clearTimeout(timer)
        push()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    check()

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      if (timer) {
        window.clearTimeout(timer)
        push()
      }
    }
  }, [enabled, client])
}
