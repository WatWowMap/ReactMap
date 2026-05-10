// @ts-check

// Larger values are stronger display precedence, matching scanner incident priorities.
export const INCIDENT_PRIORITY_SETTINGS = Object.freeze({
  INCIDENT_CONTEST: 7,
  INVASION_GENERIC: 6,
  INVASION_GIOVANNI: 5,
  INVASION_LEADER: 4,
  INVASION_GRUNT: 3,
  INVASION_EVENT_NPC: 2,
  INCIDENT_POKESTOP_ENCOUNTER: 1,
})

export const INCIDENT_DISPLAY_TYPES = Object.freeze({
  GOLD_STOP: 7,
  KECLEON: 8,
  SHOWCASE: 9,
})

/**
 * @param {{ display_type?: number | string | null }} event
 * @returns {number}
 */
export function getEventIncidentPriority(event) {
  switch (Number(event?.display_type ?? 0)) {
    case INCIDENT_DISPLAY_TYPES.SHOWCASE:
      return INCIDENT_PRIORITY_SETTINGS.INCIDENT_CONTEST
    case INCIDENT_DISPLAY_TYPES.GOLD_STOP:
      return INCIDENT_PRIORITY_SETTINGS.INVASION_GENERIC
    case INCIDENT_DISPLAY_TYPES.KECLEON:
      return INCIDENT_PRIORITY_SETTINGS.INCIDENT_POKESTOP_ENCOUNTER
    default:
      return event?.display_type
        ? INCIDENT_PRIORITY_SETTINGS.INVASION_EVENT_NPC
        : 0
  }
}

/**
 * @param {{ grunt_type?: number | string | null }} invasion
 * @returns {number}
 */
export function getInvasionIncidentPriority(invasion) {
  const gruntType = Number(invasion?.grunt_type ?? 0)
  if (!gruntType) return 0
  if (gruntType === 44) {
    return INCIDENT_PRIORITY_SETTINGS.INVASION_GIOVANNI
  }
  if (gruntType >= 41 && gruntType <= 43) {
    return INCIDENT_PRIORITY_SETTINGS.INVASION_LEADER
  }
  return INCIDENT_PRIORITY_SETTINGS.INVASION_GRUNT
}

/**
 * @param {{ display_type?: number | string | null, event_expire_timestamp?: number | string | null }} event
 * @returns {boolean}
 */
export function isActiveEvent(event, ts) {
  return Number(event?.event_expire_timestamp ?? 0) > ts
}

/**
 * @param {{ grunt_type?: number | string | null, incident_expire_timestamp?: number | string | null }} invasion
 * @returns {boolean}
 */
export function isActiveInvasion(invasion, ts) {
  return (
    Number(invasion?.grunt_type ?? 0) > 0 &&
    Number(invasion?.incident_expire_timestamp ?? 0) > ts
  )
}

/**
 * @param {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null} current
 * @param {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null} next
 * @returns {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null}
 */
export function getStrongerIncidentBlocker(current, next) {
  if (!current) return next
  if (!next) return current
  if (next.priority !== current.priority) {
    return next.priority > current.priority ? next : current
  }
  if (
    Number(next.event.display_type ?? 0) !==
    Number(current.event.display_type ?? 0)
  ) {
    return Number(next.event.display_type ?? 0) >
      Number(current.event.display_type ?? 0)
      ? next
      : current
  }
  return Number(next.expireTimestamp ?? 0) >
    Number(current.expireTimestamp ?? 0)
    ? next
    : current
}

/**
 * @param {{
 *  events?: Array<{ display_type?: number | string | null, event_expire_timestamp?: number | string | null }>
 * }} param0
 * @returns {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null}
 */
export function getVisibleIncidentBlocker({ events = [] } = {}) {
  return events.reduce((strongestEvent, event) => {
    const priority = getEventIncidentPriority(event)
    if (priority < INCIDENT_PRIORITY_SETTINGS.INVASION_GENERIC) {
      return strongestEvent
    }
    return getStrongerIncidentBlocker(strongestEvent, {
      event,
      priority,
      expireTimestamp: Number(event.event_expire_timestamp ?? 0) || null,
    })
  }, null)
}

/**
 * @param {{
 *  showcase_expiry?: number | string | null
 *  ts: number
 * }} param0
 * @returns {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null}
 */
export function getShowcaseIncidentBlocker({ showcase_expiry, ts } = {}) {
  const showcaseExpiry = Number(showcase_expiry ?? 0) || null
  if (!showcaseExpiry || showcaseExpiry <= ts) {
    return null
  }

  const showcaseEvent = { display_type: INCIDENT_DISPLAY_TYPES.SHOWCASE }
  return {
    event: showcaseEvent,
    priority: getEventIncidentPriority(showcaseEvent),
    expireTimestamp: showcaseExpiry,
  }
}

/**
 * @param {{
 *  incident_blocker_display_type?: number | string | null
 *  incident_blocker_expire_timestamp?: number | string | null
 *  ts: number
 * }} param0
 * @returns {{ event: { display_type?: number | string | null }, priority: number, expireTimestamp?: number | null } | null}
 */
export function getFallbackIncidentBlocker({
  incident_blocker_display_type,
  incident_blocker_expire_timestamp,
  ts,
} = {}) {
  const fallbackDisplayType = Number(incident_blocker_display_type ?? 0) || 0
  const fallbackExpireTimestamp =
    Number(incident_blocker_expire_timestamp ?? 0) || null

  if (
    (fallbackDisplayType !== INCIDENT_DISPLAY_TYPES.GOLD_STOP &&
      fallbackDisplayType !== INCIDENT_DISPLAY_TYPES.SHOWCASE) ||
    !fallbackExpireTimestamp ||
    fallbackExpireTimestamp <= ts
  ) {
    return null
  }

  const fallbackEvent = { display_type: fallbackDisplayType }
  return {
    event: fallbackEvent,
    priority: getEventIncidentPriority(fallbackEvent),
    expireTimestamp: fallbackExpireTimestamp,
  }
}

/**
 * @param {{
 *  events?: Array<{ display_type?: number | string | null, event_expire_timestamp?: number | string | null }>
 *  invasions?: Array<{ grunt_type?: number | string | null, incident_expire_timestamp?: number | string | null }>
 *  showcase_expiry?: number | string | null
 *  incident_blocker_display_type?: number | string | null
 *  incident_blocker_expire_timestamp?: number | string | null
 *  ts: number
 * }} param0
 */
export function getPokestopIncidentState({
  events,
  invasions,
  showcase_expiry,
  incident_blocker_display_type,
  incident_blocker_expire_timestamp,
  ts,
} = {}) {
  const normalizedEvents = Array.isArray(events) ? events : []
  const normalizedInvasions = Array.isArray(invasions) ? invasions : []
  const popupEvents = normalizedEvents.filter((event) =>
    isActiveEvent(event, ts),
  )
  const popupInvasions = normalizedInvasions.filter((invasion) =>
    isActiveInvasion(invasion, ts),
  )
  const visibleBlocker = getVisibleIncidentBlocker({
    events: popupEvents,
  })
  const showcaseBlocker = getShowcaseIncidentBlocker({
    showcase_expiry,
    ts,
  })
  const fallbackBlocker = getFallbackIncidentBlocker({
    incident_blocker_display_type,
    incident_blocker_expire_timestamp,
    ts,
  })
  const blocker = getStrongerIncidentBlocker(
    getStrongerIncidentBlocker(visibleBlocker, showcaseBlocker),
    fallbackBlocker,
  )
  const markerEvents = blocker
    ? popupEvents.filter(
        (event) => getEventIncidentPriority(event) >= blocker.priority,
      )
    : popupEvents
  const markerInvasions = blocker ? [] : popupInvasions
  const baseDisplay = getBasePokestopIncidentDisplay({
    events: markerEvents,
    invasions: markerInvasions,
  })
  const expiryTimestamps = [
    ...new Set(
      [
        ...popupInvasions.map((invasion) =>
          Number(invasion.incident_expire_timestamp ?? 0),
        ),
        ...popupEvents.map((event) =>
          Number(event.event_expire_timestamp ?? 0),
        ),
        Number(blocker?.expireTimestamp ?? 0),
      ].filter(Boolean),
    ),
  ]

  return {
    blocker,
    popupEvents,
    popupInvasions,
    markerEvents,
    markerInvasions,
    baseDisplay,
    expiryTimestamps,
  }
}

/**
 * @param {{
 *  events?: Array<{ display_type?: number | string | null }>
 *  invasions?: Array<{ grunt_type?: number | string | null }>
 * }} param0
 * @returns {number | string}
 */
export function getBasePokestopIncidentDisplay({
  events = [],
  invasions = [],
} = {}) {
  const strongestVisibleEvent = events.reduce((strongest, event) => {
    if (!strongest) return event
    const strongestPriority = getEventIncidentPriority(strongest)
    const priority = getEventIncidentPriority(event)
    if (priority !== strongestPriority) {
      return priority > strongestPriority ? event : strongest
    }
    return Number(event.display_type ?? 0) > Number(strongest.display_type ?? 0)
      ? event
      : strongest
  }, null)

  const strongestEventPriority = strongestVisibleEvent
    ? getEventIncidentPriority(strongestVisibleEvent)
    : 0
  const strongestInvasionPriority = invasions.reduce(
    (maxPriority, invasion) =>
      Math.max(maxPriority, getInvasionIncidentPriority(invasion)),
    0,
  )

  return strongestEventPriority > strongestInvasionPriority
    ? Number(strongestVisibleEvent?.display_type ?? 0) || ''
    : ''
}

/**
 * @param {{ priority: number } | null} blocker
 * @returns {string}
 */
export function getIncidentBlockReason(blocker) {
  switch (blocker?.priority) {
    case INCIDENT_PRIORITY_SETTINGS.INCIDENT_CONTEST:
      return 'showcase_block'
    case INCIDENT_PRIORITY_SETTINGS.INVASION_GENERIC:
      return 'gold_stop_block'
    default:
      return ''
  }
}

/**
 * @param {{ priority: number } | null} blocker
 * @param {number} priority
 * @returns {boolean}
 */
export function isIncidentBlockedBy(blocker, priority) {
  return !!blocker && blocker.priority > priority
}
