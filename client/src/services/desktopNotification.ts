import { t } from 'i18next'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { SimpleTTLCache } from '@services/SimpleTTLCache'
import { useMapStore } from '@store/useMapStore'

export const HAS_API = 'Notification' in window
const cache = new SimpleTTLCache(1000 * 60 * 60)
let isAudioPlaying = false

/**
 * Wrapper to get permission, to keep API check in one module
 */
export function getPermission(): NotificationPermission {
  return HAS_API ? Notification.permission : 'denied'
}

/**
 * Wrapper to request permission, to keep API check in one module
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!HAS_API) return 'denied'
  return Notification.requestPermission()
}

type RMNotificationOptions =
  import('@rm/types').Config['clientSideOptions']['notifications']

export function sendNotification(
  key: string,
  title: string,
  category: keyof Omit<
    RMNotificationOptions,
    'enabled' | 'audio' | 'audioAlwaysOn' | 'volumeLevel'
  >,
  options: NotificationOptions & {
    lat?: number
    lon?: number
    expire?: number
    audio?: string
  },
) {
  if (cache.has(key) || !HAS_API) return
  const userSettings = useStorage.getState().userSettings?.notifications || {
    enabled: false,
  }
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
