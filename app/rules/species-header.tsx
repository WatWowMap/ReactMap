/**
 * Who a rule is about, at the top of the sheet that edits it.
 *
 * "Pokémon #778" is an id, not an answer. The sprite and the name are what
 * make a sheet recognisable at a glance, and the form matters because two
 * rules on the same species and different forms are otherwise identical on
 * screen.
 *
 * The sprite comes from the same index and the same proxy the map draws
 * from, so the artwork here is the artwork on the marker rather than a
 * second source that can disagree with it.
 */

import { useEffect, useState } from 'react'
import type { SpriteIndex } from '../map/sprite-source'
import {
  loadSpriteIndex,
  SPRITE_ICON_SIZE,
  spriteIndex,
} from '../map/sprite-source'
import type { NamesLookup } from './use-names'

export interface SpeciesHeaderProps {
  /** `null` means the rule has no single subject: "Any Pokémon". */
  speciesId: number | null
  formId?: number | null
  names: NamesLookup
  /** The sentence this rule currently reads as, if there is one. */
  sentence?: string
}

export function SpeciesHeader({
  speciesId,
  formId,
  names,
  sentence,
}: SpeciesHeaderProps) {
  const [index, setIndex] = useState<SpriteIndex | null>(spriteIndex)

  useEffect(() => {
    let cancelled = false
    // Resolves to null rather than rejecting when the repository is down, so
    // a missing sprite is a header without artwork, not a broken sheet.
    void loadSpriteIndex().then((loaded) => {
      if (!cancelled) setIndex(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const title =
    speciesId === null ? 'Any Pokémon' : names.label(speciesId, formId ?? null)

  // The id rides along under the name so it stays available for a bug
  // report or a Poracle command. When the catalogue has not loaded, the
  // name IS the id, and repeating it reads as a rendering fault.
  const showsId = speciesId !== null && !title.startsWith(`#${speciesId}`)

  const artwork =
    speciesId !== null && index
      ? index.pokemon(speciesId, 0, formId ?? 0, 0, 0)
      : ''

  return (
    <div className="flex items-start gap-3">
      {artwork ? (
        <img
          src={`${artwork}?size=${SPRITE_ICON_SIZE}`}
          alt=""
          width={SPRITE_ICON_SIZE}
          height={SPRITE_ICON_SIZE}
          className="shrink-0"
        />
      ) : (
        // A fixed box either way, so the text does not jump sideways when
        // the index finishes loading.
        <span
          aria-hidden
          className="shrink-0 rounded bg-surface-raised"
          style={{ width: SPRITE_ICON_SIZE, height: SPRITE_ICON_SIZE }}
        />
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-lg font-semibold text-foreground">
          {title}
        </span>
        {showsId && (
          <span className="text-xs text-muted-foreground">#{speciesId}</span>
        )}
        {sentence && (
          <span className="text-sm text-muted-foreground">{sentence}</span>
        )}
      </span>
    </div>
  )
}
