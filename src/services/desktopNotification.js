// @ts-check
import { t } from 'i18next'

import { useStatic, useStore } from '@hooks/useStore'
import SimpleTTLCache from '@services/ttlcache'

const cache = new SimpleTTLCache(1000 * 60 * 60)
let isAudioPlaying = false

/**
 * @typedef {import('@rm/types').Config['clientSideOptions']['notifications']} RMNotificationOptions
 *
 * @param {string} key
 * @param {string} title
 * @param {keyof Omit<RMNotificationOptions, 'enabled' | 'audio' | 'audioAlwaysOn' | 'volumeLevel'>} category
 * @param {NotificationOptions & { lat?: number, lon?: number, expire?: number, audio?: string }} [options]
 */
export function desktopNotifications(key, title, category, options) {
  if (cache.has(key)) return
  const userSettings = /** @type {Partial<RMNotificationOptions>} */ (
    useStore.getState().userSettings?.notifications || {}
  )
  if (userSettings.enabled && userSettings[category]) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        const { map } = useStatic.getState()
        const { lat, lon, audio, expire, ...rest } = options
        const countdown = (expire ? expire * 1000 : Date.now() + 1) - Date.now()
        cache.set(key, countdown)
        const notif = new Notification(
          title
            .split(',')
            .filter(Boolean)
            .map((w) => t(w))
            .join(' '),
          {
            ...rest,
            lang:
              localStorage.getItem('i18nextLng') || window.navigator.language,
          },
        )
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

        notif.onclick = () => {
          if (lat && lon) {
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
      }
    })
  }
}
