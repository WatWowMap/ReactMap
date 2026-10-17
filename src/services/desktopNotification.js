// @ts-check
import { t } from 'i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { SimpleTTLCache } from '@services/SimpleTTLCache'
import { useMapStore } from '@store/useMapStore'
import { setLongTimeout } from '@utils/setLongTimeout'

import { playSynth } from './alertSounds'

export const HAS_API = 'Notification' in window
const cache = new SimpleTTLCache(1000 * 60 * 60)
let isAudioPlaying = false
let canConstructNotification = HAS_API

/**
 * Wrapper to get permission, to keep API check in one module
 * @returns {NotificationPermission}
 */
export function getPermission() {
  return HAS_API ? Notification.permission : 'denied'
}

/**
 * Wrapper to request permission, to keep API check in one module
 * @returns {Promise<NotificationPermission>}
 */
export async function requestPermission() {
  if (!HAS_API) return 'denied'
  return Notification.requestPermission()
}

/**
 * Plays the chosen notification sound. `cry` plays the given audio url (the
 * Pokémon cry); other values are built-in synthesised sounds.
 *
 * @param {string} sound
 * @param {string} [cryUrl]
 * @param {number} [volume] 0-1
 */
export function playAlertSound(sound, cryUrl, volume = 0.5) {
  if (isAudioPlaying || sound === 'none') return
  if (sound !== 'cry') {
    isAudioPlaying = true
    playSynth(sound, volume).then(() => {
      isAudioPlaying = false
    })
    return
  }
  if (!cryUrl) return
  isAudioPlaying = true
  const cry = new Audio(cryUrl)
  cry.volume = volume
  cry.addEventListener('ended', () => {
    isAudioPlaying = false
  })
  const isPlaying = cry.play()
  if (isPlaying !== undefined) {
    isPlaying.catch(() => {
      isAudioPlaying = false
    })
  }
}

/**
 * @typedef {import('@rm/types').Config['clientSideOptions']['notifications']} RMNotificationOptions
 *
 * @param {string} key
 * @param {string} title
 * @param {keyof Omit<RMNotificationOptions, 'enabled' | 'audio' | 'audioAlwaysOn' | 'volumeLevel' | 'pokemonSound' | 'raidsSound' | 'personalShinySound'>} category
 * @param {NotificationOptions & { lat?: number, lon?: number, expire?: number, audio?: string, manualId?: string | number }} [options]
 * `manualId` is the item to open on click when `key` is not its id
 */
export function sendNotification(key, title, category, options) {
  if (cache.has(key) || !canConstructNotification) return
  const userSettings = /** @type {Partial<RMNotificationOptions>} */ (
    useStorage.getState().userSettings?.notifications || {}
  )
  if (userSettings.enabled && userSettings[category]) {
    if (getPermission() === 'granted') {
      const { lat, lon, audio, expire, manualId, ...rest } = options || {}
      const countdown = expire ? expire * 1000 - Date.now() : 1
      if (countdown < 0) return

      /** @type {Notification} */
      let notif
      try {
        notif = new Notification(
          title
            .split(',')
            .filter(Boolean)
            .map((w) => t(w))
            .join(' '),
          {
            ...rest,
            tag: key,
            lang:
              localStorage.getItem('i18nextLng') || window.navigator.language,
          },
        )
      } catch (error) {
        canConstructNotification = false
        // eslint-disable-next-line no-console
        console.warn('Desktop notifications are unavailable', error)
        return
      }
      cache.set(key, countdown)
      notif.onclick = () => {
        if (!document.hasFocus()) {
          window.focus()
        }
        if (lat && lon) {
          const { map } = useMapStore.getState()
          useMemory.setState({
            manualParams: {
              // personal shinies are Pokémon on the map
              category: category === 'personalShiny' ? 'pokemon' : category,
              id: manualId ?? key,
            },
          })
          map.flyTo([lat, lon], 16)
        }
        notif.close()
      }
      if (expire) {
        const clearNotificationTimer = setLongTimeout(() => {
          notif.close()
        }, countdown)
        notif.onclose = clearNotificationTimer
      }

      if (
        userSettings.audio &&
        (userSettings.audioAlwaysOn ? true : !document.hasFocus())
      ) {
        playAlertSound(
          userSettings[`${category}Sound`] || 'cry',
          audio,
          userSettings.volumeLevel / 100,
        )
      }
    }
  }
}
