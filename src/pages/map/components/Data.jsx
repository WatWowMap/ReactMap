// @ts-check

import { useMapStore } from '@store/useMapStore'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import * as React from 'react'

import { FilterPermCheck } from './QueryData'

// biome-ignore lint/suspicious/noShadowRestrictedNames: component name predates this rule, shadowing is local to this file
export function DataView() {
  const iconsReady = useMemory((s) => !!s.Icons)
  const mapReady = useMapStore((s) => !!s.map)
  const ui = useMemory((s) => s.ui)
  const profiling = useStorage((s) => s.profiling)

  if (!iconsReady || !mapReady) return null
  return (
    <>
      {Object.keys({ ...ui, ...ui.wayfarer, ...ui.admin }).map((category) => {
        if (category === 'settings') return null
        return process.env.NODE_ENV === 'development' && profiling ? (
          <React.Profiler
            key={category}
            id={category}
            onRender={(id, phase, actualDuration, baseDuration) => {
              // eslint-disable-next-line no-console
              console.log(`[Profiler] ${id} (${phase})`, {
                actualDuration,
                baseDuration,
              })
            }}
          >
            <FilterPermCheck key={category} category={category} />
          </React.Profiler>
        ) : (
          <FilterPermCheck key={category} category={category} />
        )
      })}
    </>
  )
}
