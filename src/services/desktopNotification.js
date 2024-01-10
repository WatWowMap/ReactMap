// @ts-check
import { t } from 'i18next'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import SimpleTTLCache from '@services/ttlcache'
import { useMapStore } from '@hooks/useMapStore'

export const HAS_API = 'Notification' in window
const cache = new SimpleTTLCache(1000 * 60 * 60)
let isAudioPlaying = false

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
 * @typedef {import('@rm/types').Config['clientSideOptions']['notifications']} RMNotificationOptions
 *
 * @param {string} key
 * @param {string} title
 * @param {keyof Omit<RMNotificationOptions, 'enabled' | 'audio' | 'audioAlwaysOn' | 'volumeLevel'>} category
 * @param {NotificationOptions & { lat?: number, lon?: number, expire?: number, audio?: string }} [options]
 */
export function sendNotification(key, title, category, options) {
  if (cache.has(key) || !HAS_API) return
  const userSettings = /** @type {Partial<RMNotificationOptions>} */ (
    useStorage.getState().userSettings?.notifications || {}
  )
  if (userSettings.enabled && userSettings[category]) {
    if (getPermission() === 'granted') {
      const { lat, lon, audio, expire, ...rest } = options
      const countdown = expire ? expire * 1000 - Date.now() : 1
      if (countdown < 0) return
      cache.set(key, countdown)

      const notif = new Notification(
        title
          .split(',')
          .filter(Boolean)
          .map((w) => t(w))
          .join(' '),
        {
          ...rest,
          tag: key,
          lang: localStorage.getItem('i18nextLng') || window.navigator.language,
        },
      )
      notif.onclick = () => {
        if (!document.hasFocus()) {
          window.focus()
        }
        if (lat && lon) {
          const { map } = useMapStore.getState()
          useMemory.setState({ manualParams: { category, id: key } })
          map.flyTo([lat, lon], 16)
        }
        notif.close()
      }
      if (expire) {
        const timer = setTimeout(() => {
          notif.close()
        }, countdown)
        notif.onclose = () => {
          clearTimeout(timer)
        }
      }

      if (
        audio &&
        userSettings.audio &&
        (userSettings.audioAlwaysOn ? true : !document.hasFocus())
      ) {
        if (!isAudioPlaying) {
          isAudioPlaying = true
          const cry = new Audio(audio)
          cry.volume = userSettings.volumeLevel / 100
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
      }
    }
  }
}
