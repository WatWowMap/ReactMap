// @ts-check
import * as React from 'react'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { useMapStore } from '@store/useMapStore'
import { Utility } from '@services/Utility'

import FilterPermCheck from './QueryData'

export function DataView() {
  Utility.analytics(window.location.pathname)

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
