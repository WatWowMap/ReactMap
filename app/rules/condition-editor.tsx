/**
 * The condition rows inside a rule sheet: whatever `range` and `choice`
 * conditions the vocabulary declares are added one at a time via `+`, and
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
 *
 * The vocabulary is the same descriptor `describeWithVocabulary` reads
 * (`condition-vocabulary.ts`): this editor draws three of its five
 * condition kinds -- `range`, `choice` and `value` (one numeric input,
 * e.g. Poracle's `minTime`) -- every kind a rule or alert row's own
 * columns need edited in place. The rest (`toggle`, `text`, `count`)
 * describe things this sheet either has its own dedicated control for
 * already (exclusions -> `SpeciesPicker`) or that belong to a delivery
 * tail no rule-row editor writes; a vocabulary is free to declare them
 * and this editor simply does not offer them in its `+` menu.
 *
 * A vocabulary's `label` is written for `describeWithVocabulary`'s
 * mid-sentence use ("attack 10+", not "Attack 10+"), but a form control's
 * label is not mid-sentence -- so every label this editor shows is run
 * through `capitalize` at the point of rendering, rather than the
 * descriptor carrying a second, editor-specific casing of the same word.
 *
 * `ConditionEditor<P>` is generic over the same patch type its vocabulary
 * is (`Vocabulary<P>`, `condition-vocabulary.ts`), and `onChange` is typed
 * `(patch: P) => void` -- the exact same `P`. That is what makes handing
 * this component a foreign vocabulary (Poracle's, task 9) together with an
 * `onChange` typed for `RulePatch` a compile error instead of a silent
 * relabel: the two props are tied to one type parameter, not two
 * independently-typed ones. `RuleSheet<P>` (`rule-sheet.tsx`) carries the
 * same parameter through for the same reason.
 */

import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import type {
  ChoiceCondition,
  ConditionPatch,
  RangeCondition,
  ValueCondition,
  Vocabulary,
} from './condition-vocabulary'
import { REACTMAP_VOCABULARY } from './condition-vocabulary'
import type { RulePatch } from './rules-query'

export interface ConditionSeed {
  /** The vocabulary condition's key this seed feeds, e.g. 'iv', 'gender'. */
  type: string
  min?: number | null
  max?: number | null
  /** Choice conditions only, e.g. gender -- see `app/map/types.ts`: 0
   *  unset, 1 male, 2 female, 3 genderless. */
  value?: number | string | null
  /**
   * A range whose prefix is looked up from another column, which today is
   * only PvP: the league naming the rank beside it. Without this the block
   * renders against nothing and a stored league shows as unselected.
   */
  label?: number | string | null
}

/** What the editor holds per row while it is open, before it becomes a
 *  patch. Deliberately not typed `P`: `P`'s own keys can carry values (a
 *  `boolean` `enabled`, a `number[]` `exclusions`) this editor never
 *  writes, and TypeScript cannot prove a write through a generic key is
 *  safe against all of them -- see `commit`, the one place this crosses
 *  into `P`. */
type FieldValues = Record<string, number | string | null>

interface EditorState {
  active: ReadonlySet<string>
  fields: FieldValues
}

/** "attack" -> "Attack". Already-capitalised words (`IV`, `CP`, `Little`) pass through unchanged. */
function capitalize(word: string): string {
  return word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

function editableDefs<P extends ConditionPatch>(vocab: Vocabulary<P>) {
  return vocab.conditions.filter(
    (def): def is RangeCondition<P> | ChoiceCondition<P> | ValueCondition<P> =>
      def.kind === 'range' || def.kind === 'choice' || def.kind === 'value',
  )
}

function seedState<P extends ConditionPatch>(
  conditions: ConditionSeed[],
  vocab: Vocabulary<P>,
): EditorState {
  const byKey = new Map(vocab.conditions.map((def) => [def.key, def]))
  const active = new Set<string>()
  const fields: FieldValues = {}
  for (const seed of conditions) {
    const def = byKey.get(seed.type)
    if (!def) continue
    active.add(seed.type)
    if (def.kind === 'choice' || def.kind === 'value') {
      fields[def.field] = seed.value ?? null
    } else if (def.kind === 'range') {
      if (seed.min != null) fields[def.minField] = seed.min
      if (seed.max != null) fields[def.maxField] = seed.max
      if (def.labelField && seed.label != null) {
        fields[def.labelField] = seed.label
      }
    }
  }
  return { active, fields }
}

export interface ConditionEditorProps<P extends ConditionPatch = RulePatch> {
  /** Conditions already on the rule -- each becomes one active row, seeded with its value. */
  conditions?: ConditionSeed[]
  /** The schema this editor's rows are drawn from. Defaults to ReactMap's own `rule` columns. */
  vocabulary?: Vocabulary<P>
  onChange?: (patch: P) => void
}

/**
 * Two call shapes, and the overload pair is what keeps them apart.
 * Omitting `vocabulary` PINS the patch type to `RulePatch` rather than
 * inferring it from `onChange` alone: the default vocabulary is
 * ReactMap's own columns, so an `onChange` typed for anything else is a
 * mislabel, and this signature rejects it. Supplying a vocabulary infers
 * the patch type from it, and `onChange` must then agree.
 *
 * Without the first signature, `<ConditionEditor onChange={(patch:
 * AlertPatch) => ...} />` compiled: `P` inferred as `AlertPatch` from
 * `onChange`, and ReactMap's vocabulary got handed to the caller under
 * Poracle's name. `condition-editor.test.tsx` holds a `@ts-expect-error`
 * for exactly that call, so deleting these signatures fails typecheck.
 */
export function ConditionEditor(
  props: ConditionEditorProps<RulePatch>,
): ReactElement
export function ConditionEditor<P extends ConditionPatch>(
  props: ConditionEditorProps<P> & { vocabulary: Vocabulary<P> },
): ReactElement
export function ConditionEditor<P extends ConditionPatch = RulePatch>({
  conditions = [],
  vocabulary,
  onChange,
}: ConditionEditorProps<P>) {
  // Sound because of the overloads above, not because of a convention:
  // `vocabulary` can only be absent on the first signature, whose `P` is
  // `RulePatch`, which is exactly what `REACTMAP_VOCABULARY` is declared
  // as. The cast is the implementation signature's generic `P` catching
  // up with what the call site already proved.
  const resolvedVocabulary =
    vocabulary ?? (REACTMAP_VOCABULARY as unknown as Vocabulary<P>)

  const byKey = useMemo(
    () => new Map(resolvedVocabulary.conditions.map((def) => [def.key, def])),
    [resolvedVocabulary],
  )
  const [{ active, fields }, setState] = useState<EditorState>(() =>
    seedState(conditions, resolvedVocabulary),
  )
  const [menuOpen, setMenuOpen] = useState(false)

  const addableDefs = editableDefs(resolvedVocabulary).filter(
    (def) => !active.has(def.key),
  )
  const activeRanges = [...active]
    .map((key) => byKey.get(key))
    .filter(
      (def): def is RangeCondition<P> =>
        def?.kind === 'range' && def.key !== 'pvp',
    )
  const activeChoices = [...active]
    .map((key) => byKey.get(key))
    .filter((def): def is ChoiceCondition<P> => def?.kind === 'choice')
  const activeValues = [...active]
    .map((key) => byKey.get(key))
    .filter((def): def is ValueCondition<P> => def?.kind === 'value')
  const pvpDef = resolvedVocabulary.conditions.find(
    (def): def is RangeCondition<P> =>
      def.kind === 'range' && def.key === 'pvp',
  )

  function commit(nextActive: ReadonlySet<string>, nextFields: FieldValues) {
    setState({ active: nextActive, fields: nextFields })
    // Every key written into `nextFields` came from a `def.field`,
    // `def.minField` or `def.maxField` -- each typed `keyof P & string` --
    // so this object's keys are a subset of `P`'s by construction. `P`
    // itself is a record of optional columns (`RulePatch` is a `Partial`;
    // any concrete `P` a vocabulary is declared against should be too), so
    // a partial key set is a valid `P`. TypeScript cannot verify a write
    // through a generic key is sound against every possible `P`, which is
    // what this one cast bridges -- unlike the cast this replaces, it is
    // not asserting an unrelated schema onto the result, it is asserting
    // that code which only ever writes keys typed `keyof P` produced a `P`.
    onChange?.(nextFields as P)
  }

  function addCondition(key: string) {
    const def = byKey.get(key)
    if (!def) return
    const nextActive = new Set(active)
    nextActive.add(key)
    const nextFields: FieldValues = { ...fields }
    if (def.kind === 'choice') {
      // A starting value the user immediately edits -- not a guess at
      // what they meant, just something other than "unset" to edit from.
      nextFields[def.field] = def.options[0]?.value ?? null
    } else if (def.kind === 'range') {
      nextFields[def.minField] = def.floor ?? 0
      // A PvP range says nothing without its league -- `describeCondition`
      // omits the whole condition when the league column is null -- so a
      // row added without one is a control the person can edit and a
      // sentence that never changes. Seed it the same way a `choice` gets
      // its first option.
      if (def.labelField && fields[def.labelField] == null) {
        const first = Object.keys(def.labelWords ?? {})[0]
        if (first !== undefined) nextFields[def.labelField] = Number(first)
      }
    } else if (def.kind === 'value') {
      nextFields[def.field] = 0
    }
    setMenuOpen(false)
    commit(nextActive, nextFields)
  }

  function updateRange(
    def: RangeCondition<P>,
    bound: 'min' | 'max',
    raw: string,
  ) {
    const value = raw === '' ? null : Number(raw)
    commit(active, {
      ...fields,
      [bound === 'min' ? def.minField : def.maxField]: value,
    })
  }

  function updateChoice(def: ChoiceCondition<P>, value: string) {
    const option = def.options.find((o) => String(o.value) === value)
    commit(active, { ...fields, [def.field]: option?.value ?? value })
  }

  function updateValue(def: ValueCondition<P>, raw: string) {
    const value = raw === '' ? null : Number(raw)
    commit(active, { ...fields, [def.field]: value })
  }

  function updatePvpLeague(def: RangeCondition<P>, cap: number) {
    if (!def.labelField) return
    commit(active, { ...fields, [def.labelField]: cap })
  }

  function updatePvpRank(
    def: RangeCondition<P>,
    bound: 'min' | 'max',
    raw: string,
  ) {
    updateRange(def, bound, raw)
  }

  return (
    <div className="flex flex-col gap-3">
      {activeRanges.map((def) => (
        <div key={def.key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">
            {capitalize(def.label)}
          </span>
          <Input
            type="number"
            aria-label={`${capitalize(def.label)} minimum`}
            value={(fields[def.minField] as number | null | undefined) ?? ''}
            onChange={(event) => updateRange(def, 'min', event.target.value)}
          />
          <Input
            type="number"
            aria-label={`${capitalize(def.label)} maximum`}
            value={(fields[def.maxField] as number | null | undefined) ?? ''}
            onChange={(event) => updateRange(def, 'max', event.target.value)}
          />
        </div>
      ))}

      {activeChoices.map((def) => (
        <div key={def.key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">
            {capitalize(def.label)}
          </span>
          <RadioGroup
            className="flex flex-row gap-3"
            value={String(fields[def.field] ?? def.options[0]?.value ?? '')}
            onValueChange={(value) => updateChoice(def, value)}
          >
            {def.options.map((option) => (
              <span
                key={option.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <RadioGroupItem
                  id={`${def.key}-${option.value}`}
                  value={String(option.value)}
                />
                <label htmlFor={`${def.key}-${option.value}`}>
                  {capitalize(option.label)}
                </label>
              </span>
            ))}
          </RadioGroup>
        </div>
      ))}

      {activeValues.map((def) => (
        <div key={def.key} className="flex items-center gap-2">
          <span className="w-16 text-sm text-muted-foreground">
            {capitalize(def.label)}
          </span>
          <Input
            type="number"
            aria-label={capitalize(def.label)}
            value={(fields[def.field] as number | null | undefined) ?? ''}
            onChange={(event) => updateValue(def, event.target.value)}
          />
        </div>
      ))}

      <div className="relative">
        {/*
          Named rather than a bare `+`. It is the only way to put a
          condition on a rule, and a lone glyph says neither what it adds
          nor that anything is addable.
        */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMenuOpen((o) => !o)}
        >
          + Add a condition
        </Button>
        {menuOpen && (
          <div
            role="listbox"
            aria-label="Add condition"
            className="absolute z-10 mt-1 flex flex-col rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {addableDefs.map((def) => (
              <button
                key={def.key}
                type="button"
                role="option"
                aria-selected={false}
                className="rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => addCondition(def.key)}
              >
                {capitalize(def.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {pvpDef?.labelField && active.has(pvpDef.key) && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">PvP league</span>
          <RadioGroup
            className="flex flex-row gap-3"
            value={
              fields[pvpDef.labelField] != null
                ? String(fields[pvpDef.labelField])
                : null
            }
            onValueChange={(value) => updatePvpLeague(pvpDef, Number(value))}
          >
            {Object.entries(pvpDef.labelWords ?? {}).map(([cap, label]) => (
              <span key={cap} className="flex items-center gap-1.5 text-sm">
                <RadioGroupItem id={`pvp-league-${cap}`} value={cap} />
                <label htmlFor={`pvp-league-${cap}`}>{capitalize(label)}</label>
              </span>
            ))}
          </RadioGroup>
          {/*
            Labelled visibly, not just for a screen reader. Two bare number
            boxes under a league picker do not say what they are, and rank 1
            being the best result rather than the worst is exactly the thing
            a person needs told rather than guessed.
          */}
          <div className="flex items-end gap-2">
            <span className="flex flex-1 flex-col gap-1">
              <label
                htmlFor="pvp-rank-best"
                className="text-xs text-muted-foreground"
              >
                Best rank
              </label>
              <Input
                id="pvp-rank-best"
                type="number"
                placeholder="1"
                aria-label="PvP rank minimum"
                value={
                  (fields[pvpDef.minField] as number | null | undefined) ?? ''
                }
                onChange={(event) =>
                  updatePvpRank(pvpDef, 'min', event.target.value)
                }
              />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <label
                htmlFor="pvp-rank-worst"
                className="text-xs text-muted-foreground"
              >
                Worst rank
              </label>
              <Input
                id="pvp-rank-worst"
                type="number"
                placeholder="4096"
                aria-label="PvP rank maximum"
                value={
                  (fields[pvpDef.maxField] as number | null | undefined) ?? ''
                }
                onChange={(event) =>
                  updatePvpRank(pvpDef, 'max', event.target.value)
                }
              />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
