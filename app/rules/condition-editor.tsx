/**
 * The condition rows inside a rule sheet: IV, attack, defence, stamina,
 * level, CP, gender and size range are added one at a time via `+`, and
 * every active row ANDs together into the patch the sheet writes back --
 * a rule has always been the conjunction of its conditions, never a
 * choice of one. PvP is its own permanent block below the range rows
 * rather than a tenth thing you `+` in: 1.x asked for three independent
 * range widgets, one per league; the 2.0 schema holds one `pvpLeague` and
 * one rank range (`server/src/db/rules-schema.ts`), so the control that
 * matches it is a single radio group, always visible, picking which one
 * league the rank range below it means. The widening a rank above 1 needs
 * against Golbat's collapsed-rank lookup already lives in
 * `rules-to-golbat-filters.ts` and is never re-derived here -- this editor
 * only ever writes the rule's own declared bounds.
 */

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import type { RulePatch } from './rules-query'

export const RANGE_KINDS = [
  'iv',
  'atk',
  'def',
  'sta',
  'level',
  'cp',
  'size',
] as const
export type RangeKind = (typeof RANGE_KINDS)[number]
export type ConditionKind = RangeKind | 'gender'

export interface ConditionSeed {
  type: ConditionKind
  min?: number | null
  max?: number | null
  /** Gender only -- see `app/map/types.ts`: 0 unset, 1 male, 2 female, 3 genderless. */
  value?: number | null
}

/** Every `RulePatch` key whose value is `number | null` -- the only kind a range row ever writes. */
type NumericPatchKey = {
  [K in keyof RulePatch]-?: NonNullable<RulePatch[K]> extends number ? K : never
}[keyof RulePatch]

interface RangeSpec {
  min: NumericPatchKey
  max: NumericPatchKey
  label: string
}

const RANGE_SPECS: Record<RangeKind, RangeSpec> = {
  iv: { min: 'ivMin', max: 'ivMax', label: 'IV' },
  atk: { min: 'atkMin', max: 'atkMax', label: 'Attack' },
  def: { min: 'defMin', max: 'defMax', label: 'Defence' },
  sta: { min: 'staMin', max: 'staMax', label: 'Stamina' },
  level: { min: 'levelMin', max: 'levelMax', label: 'Level' },
  cp: { min: 'cpMin', max: 'cpMax', label: 'CP' },
  size: { min: 'sizeMin', max: 'sizeMax', label: 'Size' },
}

const CONDITION_LABEL: Record<ConditionKind, string> = {
  ...Object.fromEntries(
    RANGE_KINDS.map((kind) => [kind, RANGE_SPECS[kind].label]),
  ),
  gender: 'Gender',
} as Record<ConditionKind, string>

const ALL_KINDS: ConditionKind[] = [...RANGE_KINDS, 'gender']

/** `500 | 1500 | 2500`, per `rule_pokemon.pvp_league` -- see rule-row.ts's `LEAGUE_BY_CAP`. */
const PVP_LEAGUES = [
  { cap: 500, label: 'Little' },
  { cap: 1500, label: 'Great' },
  { cap: 2500, label: 'Ultra' },
] as const

interface EditorState {
  active: ReadonlySet<ConditionKind>
  fields: RulePatch
}

function seedState(conditions: ConditionSeed[]): EditorState {
  const active = new Set<ConditionKind>()
  const fields: RulePatch = {}
  for (const seed of conditions) {
    active.add(seed.type)
    if (seed.type === 'gender') {
      fields.gender = seed.value ?? null
    } else {
      const spec = RANGE_SPECS[seed.type]
      if (seed.min != null) fields[spec.min] = seed.min
      if (seed.max != null) fields[spec.max] = seed.max
    }
  }
  return { active, fields }
}

export interface ConditionEditorProps {
  /** Conditions already on the rule -- each becomes one active row, seeded with its value. */
  conditions?: ConditionSeed[]
  onChange?: (patch: RulePatch) => void
}

export function ConditionEditor({
  conditions = [],
  onChange,
}: ConditionEditorProps) {
  const [{ active, fields }, setState] = useState<EditorState>(() =>
    seedState(conditions),
  )
  const [menuOpen, setMenuOpen] = useState(false)

  const addableKinds = ALL_KINDS.filter((kind) => !active.has(kind))

  function commit(
    nextActive: ReadonlySet<ConditionKind>,
    nextFields: RulePatch,
  ) {
    setState({ active: nextActive, fields: nextFields })
    onChange?.(nextFields)
  }

  function addCondition(kind: ConditionKind) {
    const nextActive = new Set(active)
    nextActive.add(kind)
    const nextFields: RulePatch = { ...fields }
    if (kind === 'gender') {
      nextFields.gender = 1
    } else {
      // A starting value the user immediately edits -- not a guess at
      // what they meant, just something other than "unset" to edit from.
      nextFields[RANGE_SPECS[kind].min] = 0
    }
    setMenuOpen(false)
    commit(nextActive, nextFields)
  }

  function updateRange(kind: RangeKind, bound: 'min' | 'max', raw: string) {
    const spec = RANGE_SPECS[kind]
    const value = raw === '' ? null : Number(raw)
    commit(active, {
      ...fields,
      [bound === 'min' ? spec.min : spec.max]: value,
    })
  }

  function updateGender(value: number) {
    commit(active, { ...fields, gender: value })
  }

  function updatePvpLeague(cap: number) {
    commit(active, { ...fields, pvpLeague: cap })
  }

  function updatePvpRank(bound: 'min' | 'max', raw: string) {
    const value = raw === '' ? null : Number(raw)
    commit(active, {
      ...fields,
      [bound === 'min' ? 'pvpRankMin' : 'pvpRankMax']: value,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {[...active]
        .filter((kind): kind is RangeKind => kind !== 'gender')
        .map((kind) => {
          const spec = RANGE_SPECS[kind]
          return (
            <div key={kind} className="flex items-center gap-2">
              <span className="w-16 text-sm text-muted-foreground">
                {spec.label}
              </span>
              <Input
                type="number"
                aria-label={`${spec.label} minimum`}
                value={(fields[spec.min] as number | null | undefined) ?? ''}
                onChange={(event) =>
                  updateRange(kind, 'min', event.target.value)
                }
              />
              <Input
                type="number"
                aria-label={`${spec.label} maximum`}
                value={(fields[spec.max] as number | null | undefined) ?? ''}
                onChange={(event) =>
                  updateRange(kind, 'max', event.target.value)
                }
              />
            </div>
          )
        })}

      {active.has('gender') && (
        <div className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">Gender</span>
          <RadioGroup
            className="flex flex-row gap-3"
            value={String(fields.gender ?? 1)}
            onValueChange={(value) => updateGender(Number(value))}
          >
            {[
              { value: 1, label: 'Male' },
              { value: 2, label: 'Female' },
              { value: 3, label: 'Genderless' },
            ].map((option) => (
              <span
                key={option.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <RadioGroupItem
                  id={`gender-${option.value}`}
                  value={String(option.value)}
                />
                <label htmlFor={`gender-${option.value}`}>{option.label}</label>
              </span>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMenuOpen((o) => !o)}
        >
          +
        </Button>
        {menuOpen && (
          <div
            role="listbox"
            aria-label="Add condition"
            className="absolute z-10 mt-1 flex flex-col rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {addableKinds.map((kind) => (
              <button
                key={kind}
                type="button"
                role="option"
                aria-selected={false}
                className="rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => addCondition(kind)}
              >
                {CONDITION_LABEL[kind]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">PvP league</span>
        <RadioGroup
          className="flex flex-row gap-3"
          value={fields.pvpLeague != null ? String(fields.pvpLeague) : null}
          onValueChange={(value) => updatePvpLeague(Number(value))}
        >
          {PVP_LEAGUES.map((league) => (
            <span
              key={league.cap}
              className="flex items-center gap-1.5 text-sm"
            >
              <RadioGroupItem
                id={`pvp-league-${league.cap}`}
                value={String(league.cap)}
              />
              <label htmlFor={`pvp-league-${league.cap}`}>{league.label}</label>
            </span>
          ))}
        </RadioGroup>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            aria-label="PvP rank minimum"
            value={fields.pvpRankMin ?? ''}
            onChange={(event) => updatePvpRank('min', event.target.value)}
          />
          <Input
            type="number"
            aria-label="PvP rank maximum"
            value={fields.pvpRankMax ?? ''}
            onChange={(event) => updatePvpRank('max', event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
