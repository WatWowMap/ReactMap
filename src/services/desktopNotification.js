// @ts-check
import { t } from 'i18next'

import { useStatic } from '@hooks/useStore'
import SimpleTTLCache from '@services/ttlcache'

const cache = new SimpleTTLCache(1000 * 60 * 60)
let isAudioPlaying = false

/**
 *
 * @param {string} key
 * @param {string} title
 * @param {NotificationOptions & { lat?: number, lon?: number, expire?: number, audio?: string }} [options]
 */
export function desktopNotifications(key, title, options) {
  if (!cache.has(key)) {
    const { map } = useStatic.getState()
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
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
        if (audio && 'Audio' in window && !document.hasFocus()) {
          const cry = new Audio(audio)
          cry.volume = 0.5
          if (!isAudioPlaying) {
            isAudioPlaying = true
            cry.play()
          }
          cry.addEventListener('ended', () => {
            isAudioPlaying = false
          })
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
