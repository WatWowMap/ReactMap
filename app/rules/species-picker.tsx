/**
 * The species picker behind a rule's subject and its exclusions -- one
 * tile per species, an affordance to expand into its forms, search over
 * both, and a select-all-shown action. Consumes `masterfile.species`
 * (Task 8) as-is: every label rendered here is `SpeciesEntry.forms[].label`,
 * composed server-side by `names.ts`. This module never touches a
 * `poke_`/`form_` key, and never recomposes "species (form)" itself --
 * doing so here is exactly how the key format leaked back out before.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'

export interface FormEntry {
  id: number
  name: string
  label: string
}

export interface SpeciesEntry {
  id: number
  name: string
  forms: FormEntry[]
}

/**
 * One target in a picker's selection: a bare species id means "this
 * species, any form" (the same thing a `null` `formId` means on a `Rule`
 * row); the `{ speciesId, formId }` shape means one specific form and
 * nothing else -- selecting a form never implies its base species.
 */
export type SpeciesSelection = number | { speciesId: number; formId: number }

function isWholeSpecies(
  selection: SpeciesSelection,
  speciesId: number,
): boolean {
  return typeof selection === 'number' && selection === speciesId
}

function isForm(
  selection: SpeciesSelection,
  speciesId: number,
  formId: number,
): boolean {
  return (
    typeof selection === 'object' &&
    selection.speciesId === speciesId &&
    selection.formId === formId
  )
}

function sameSelection(a: SpeciesSelection, b: SpeciesSelection): boolean {
  if (typeof a === 'number' || typeof b === 'number') return a === b
  return a.speciesId === b.speciesId && a.formId === b.formId
}

/**
 * One filtered row: `visibleForms` is every form to show once expanded,
 * and `autoExpand` is true only when the species matched purely because
 * one of its forms did -- a plain species-name match stays collapsed
 * until the user opens it, exactly like the unfiltered list.
 */
interface FilteredEntry {
  entry: SpeciesEntry
  visibleForms: FormEntry[]
  autoExpand: boolean
}

function filterSpecies(species: SpeciesEntry[], term: string): FilteredEntry[] {
  const needle = term.trim().toLowerCase()
  if (!needle) {
    return species.map((entry) => ({
      entry,
      visibleForms: entry.forms,
      autoExpand: false,
    }))
  }

  const results: FilteredEntry[] = []
  for (const entry of species) {
    if (entry.name.toLowerCase().includes(needle)) {
      results.push({ entry, visibleForms: entry.forms, autoExpand: false })
      continue
    }
    const matchingForms = entry.forms.filter((form) =>
      form.label.toLowerCase().includes(needle),
    )
    if (matchingForms.length > 0) {
      results.push({ entry, visibleForms: matchingForms, autoExpand: true })
    }
  }
  return results
}

export interface SpeciesPickerProps {
  species: SpeciesEntry[]
  selected?: SpeciesSelection[]
  onChange?: (selection: SpeciesSelection[]) => void
}

export function SpeciesPicker({
  species,
  selected = [],
  onChange,
}: SpeciesPickerProps) {
  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  // A native listener, not an `onChange` prop: React's controlled-input
  // change detection depends on a module-level feature flag
  // (`isInputEventSupported` in react-dom's `ChangeEventPlugin`) computed
  // once, the first time `react-dom/client` is imported. Every test file
  // in this suite imports `@testing-library/react` -- and so `react-dom/
  // client` -- before its own `beforeAll(setupDom)` call runs (ES imports
  // are hoisted ahead of all top-level code), so that first import always
  // happens against a window-less environment and the flag freezes false
  // for the rest of the process; no later `setupDom()` re-registering
  // happy-dom un-freezes it. `addEventListener` bypasses React's synthetic
  // event system (and that frozen flag) entirely, and is indistinguishable
  // from `onChange` in a real browser, where the flag is always true.
  useEffect(() => {
    const input = searchRef.current
    if (!input) return
    // A real browser only ever fires `input`; `change` is listened for
    // too because `@testing-library`'s `fireEvent.change` -- the
    // documented way to drive a text field in this test suite -- fires
    // `change`, not `input`, and both land on the same handler regardless.
    const handleInput = () => setTerm(input.value)
    input.addEventListener('input', handleInput)
    input.addEventListener('change', handleInput)
    return () => {
      input.removeEventListener('input', handleInput)
      input.removeEventListener('change', handleInput)
    }
  }, [])

  const filtered = useMemo(() => filterSpecies(species, term), [species, term])

  function toggleExpanded(speciesId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(speciesId)) next.delete(speciesId)
      else next.add(speciesId)
      return next
    })
  }

  function toggleWholeSpecies(speciesId: number) {
    const next = selected.some((s) => isWholeSpecies(s, speciesId))
      ? selected.filter((s) => !isWholeSpecies(s, speciesId))
      : [...selected, speciesId]
    onChange?.(next)
  }

  function toggleForm(speciesId: number, formId: number) {
    const next = selected.some((s) => isForm(s, speciesId, formId))
      ? selected.filter((s) => !isForm(s, speciesId, formId))
      : [...selected, { speciesId, formId }]
    onChange?.(next)
  }

  function selectAllShown() {
    const shown: SpeciesSelection[] = []
    for (const { entry, visibleForms, autoExpand } of filtered) {
      if (autoExpand || expanded.has(entry.id)) {
        for (const form of visibleForms) {
          shown.push({ speciesId: entry.id, formId: form.id })
        }
      } else {
        shown.push(entry.id)
      }
    }
    const next = [...selected]
    for (const item of shown) {
      if (!next.some((s) => sameSelection(s, item))) next.push(item)
    }
    onChange?.(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          ref={searchRef}
          type="search"
          aria-label="Search Pokémon"
          placeholder="Search Pokémon or form..."
          defaultValue=""
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAllShown}
        >
          Select all shown
        </Button>
      </div>
      <div style={{ height: 320, overflowY: 'auto' }}>
        {filtered.map((row) => {
          const { entry, visibleForms, autoExpand } = row
          const isExpanded = autoExpand || expanded.has(entry.id)
          const wholeSelected = selected.some((s) =>
            isWholeSpecies(s, entry.id),
          )
          const anyFormSelected = selected.some(
            (s) => typeof s === 'object' && s.speciesId === entry.id,
          )
          const checked = wholeSelected
            ? true
            : anyFormSelected
              ? 'indeterminate'
              : false

          return (
            <div key={entry.id} className="flex flex-col gap-1 py-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  aria-label={entry.name}
                  checked={checked}
                  onCheckedChange={() => toggleWholeSpecies(entry.id)}
                />
                <span className="text-sm">{entry.name}</span>
                {entry.forms.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${entry.name}`}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    {isExpanded ? '-' : '+'}
                  </Button>
                )}
              </div>
              {isExpanded &&
                visibleForms.map((form) => (
                  <div key={form.id} className="ml-6 flex items-center gap-2">
                    <Checkbox
                      aria-label={form.label}
                      checked={selected.some((s) =>
                        isForm(s, entry.id, form.id),
                      )}
                      onCheckedChange={() => toggleForm(entry.id, form.id)}
                    />
                    <span className="text-sm">{form.label}</span>
                  </div>
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
