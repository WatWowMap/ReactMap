// @ts-check

/**
 * Built-in notification sounds, synthesised with the Web Audio API so no audio
 * assets have to be shipped. `cry` plays the Pokémon cry supplied by the caller
 * and `none` is silent.
 *
 * Each note: [frequency Hz, start s, duration s, oscillator type, end frequency Hz?]
 * @type {Record<string, [number, number, number, OscillatorType, number?][]>}
 */
const SYNTHS = {
  chime: [
    [1046.5, 0, 0.5, 'sine'],
    [1318.5, 0.12, 0.5, 'sine'],
    [1568, 0.24, 0.7, 'sine'],
  ],
  bell: [
    [880, 0, 1.2, 'sine'],
    [1760, 0, 0.6, 'sine'],
    [2637, 0, 0.3, 'sine'],
  ],
  ping: [[1760, 0, 0.25, 'sine']],
  alert: [
    [880, 0, 0.15, 'square'],
    [880, 0.25, 0.15, 'square'],
    [880, 0.5, 0.15, 'square'],
  ],
  fanfare: [
    [523.3, 0, 0.15, 'triangle'],
    [659.3, 0.15, 0.15, 'triangle'],
    [784, 0.3, 0.15, 'triangle'],
    [1046.5, 0.45, 0.5, 'triangle'],
  ],
  sonar: [
    [1200, 0, 0.6, 'sine', 600],
    [1200, 0.8, 0.6, 'sine', 600],
  ],
  arcade: [
    [440, 0, 0.08, 'square', 880],
    [660, 0.1, 0.08, 'square', 1320],
    [880, 0.2, 0.2, 'square', 1760],
  ],
  siren: [
    [700, 0, 0.4, 'sawtooth', 1100],
    [1100, 0.4, 0.4, 'sawtooth', 700],
    [700, 0.8, 0.4, 'sawtooth', 1100],
  ],
}

export const ALERT_SOUNDS = ['cry', ...Object.keys(SYNTHS), 'none']

/** @type {AudioContext | null} */
let context = null

/**
 * @param {string} sound
 * @param {number} volume 0-1
 * @returns {Promise<void>} resolves when the sound has finished
 */
export function playSynth(sound, volume) {
  const notes = SYNTHS[sound]
  if (!notes) return Promise.resolve()
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return Promise.resolve()
    context = context || new Ctx()
    const ctx = context
    if (ctx.state === 'suspended') ctx.resume()
    const start = ctx.currentTime
    let end = 0
    notes.forEach(([freq, offset, duration, type, endFreq]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, start + offset)
      if (endFreq) {
        osc.frequency.linearRampToValueAtTime(
          endFreq,
          start + offset + duration,
        )
      }
      // square/sawtooth are much louder than sine at the same gain
      const level = (type === 'sine' ? 0.4 : 0.15) * volume
      gain.gain.setValueAtTime(level, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start + offset)
      osc.stop(start + offset + duration + 0.05)
      end = Math.max(end, offset + duration)
    })
    return new Promise((resolve) => {
      setTimeout(resolve, (end + 0.1) * 1000)
    })
  } catch (e) {
    return Promise.resolve()
  }
}
