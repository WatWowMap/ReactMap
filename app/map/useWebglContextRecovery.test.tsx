import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { setupDom, teardownDom } from '../test-setup'
import {
  type UseWebglContextRecoveryResult,
  useWebglContextRecovery,
} from './useWebglContextRecovery'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

/*
 * The real canvas comes from MapLibre, created inside the container this
 * hook watches. The harness stands one up by hand - a plain <canvas> is
 * enough, since this hook only ever touches it as a DOM EventTarget and
 * never reaches for a WebGL context. See task-6-7 notes: this is the
 * state machine, not the GPU.
 */
function Harness({
  onRestore,
  onResult,
}: {
  onRestore: () => void
  onResult: (result: UseWebglContextRecoveryResult) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const result = useWebglContextRecovery(containerRef, { onRestore })
  onResult(result)
  return (
    <div ref={containerRef}>
      <canvas data-testid="map-canvas" />
    </div>
  )
}

function dispatchOn(canvas: HTMLCanvasElement, type: string): Event {
  const event = new Event(type, { cancelable: true })
  act(() => {
    canvas.dispatchEvent(event)
  })
  return event
}

test('flips restoring true on context loss and prevents the default', () => {
  let latest: UseWebglContextRecoveryResult | undefined
  const { container } = render(
    <Harness onRestore={() => undefined} onResult={(r) => (latest = r)} />,
  )
  const canvas = container.querySelector('canvas') as HTMLCanvasElement

  const event = dispatchOn(canvas, 'webglcontextlost')

  expect(event.defaultPrevented).toBe(true)
  expect(latest?.restoring).toBe(true)
})

test('clears restoring and calls onRestore when the context comes back', () => {
  let latest: UseWebglContextRecoveryResult | undefined
  let restoreCount = 0
  const { container } = render(
    <Harness
      onRestore={() => (restoreCount += 1)}
      onResult={(r) => (latest = r)}
    />,
  )
  const canvas = container.querySelector('canvas') as HTMLCanvasElement

  dispatchOn(canvas, 'webglcontextlost')
  expect(latest?.restoring).toBe(true)

  dispatchOn(canvas, 'webglcontextrestored')

  expect(restoreCount).toBe(1)
  expect(latest?.restoring).toBe(false)
})

test('onRestore never fires without a preceding loss', () => {
  let restoreCount = 0
  render(
    <Harness
      onRestore={() => (restoreCount += 1)}
      onResult={() => undefined}
    />,
  )
  expect(restoreCount).toBe(0)
})

test('stops listening once unmounted', () => {
  let restoreCount = 0
  const { container, unmount } = render(
    <Harness
      onRestore={() => (restoreCount += 1)}
      onResult={() => undefined}
    />,
  )
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  unmount()

  dispatchOn(canvas, 'webglcontextlost')
  dispatchOn(canvas, 'webglcontextrestored')

  expect(restoreCount).toBe(0)
})
