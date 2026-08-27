import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { RuleCard } from '../rules/rule-card'
import { RuleEditor } from '../rules/rule-editor'
import { groupRules } from '../rules/rule-grouping'
import type { RuleTemplate } from '../rules/rule-templates'
import { BLANK_TEMPLATE, STARTING_POINTS } from '../rules/rule-templates'
import type { RuleGroup } from '../rules/rule-types'
import type { RulesClient } from '../rules/rules-query'
import { useRules } from '../rules/rules-query'
import type { MasterfileClient } from '../rules/use-names'
import { useNames, useSpeciesCatalog } from '../rules/use-names'

/**
 * Every account has exactly one profile, seeded on first sign-in -- see
 * `map-canvas.tsx`'s `CURRENT_PROFILE_ID`, which this mirrors until the
 * (deferred) profile switcher lands.
 */
const CURRENT_PROFILE_ID = 1

export interface FiltersPageProps {
  /** Test seam: a fake in place of the default tRPC-backed client. */
  rulesClient?: RulesClient
  /** Test seam: a fake in place of the default tRPC-backed client. */
  namesClient?: MasterfileClient
}

export function FiltersPage({
  rulesClient,
  namesClient,
}: FiltersPageProps = {}) {
  const { rules, create, update } = useRules(
    CURRENT_PROFILE_ID,
    rulesClient ? { client: rulesClient } : undefined,
  )
  const namesOptions = namesClient ? { client: namesClient } : undefined
  const names = useNames(namesOptions)
  const species = useSpeciesCatalog(namesOptions)
  const groups = useMemo(() => groupRules([...rules.values()]), [rules])

  // Which group's sheet is open, by group id. Held as an id rather than
  // the group object so an edit that regroups the list (a split) does not
  // leave a stale copy of the group on screen.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const openGroup = groups.find((group) => group.id === openGroupId) ?? null

  // A starting point opens the editor against a draft rather than writing a
  // rule. A filter that exists before anyone has said what it should match
  // is already doing something on the map nobody asked for, and the
  // starting points are deliberately broad, so the blank one matches every
  // Pokemon there is.
  const [draft, setDraft] = useState<RuleTemplate | null>(null)

  function startFrom(template: RuleTemplate) {
    setDraft(template)
  }

  /**
   * The draft as the shape `RuleEditor` edits. It has no rule ids because
   * nothing has been written; Save creates instead of updating.
   */
  const draftGroup: RuleGroup | null = draft
    ? {
        id: 'draft',
        name: draft.input.name ?? 'New filter',
        ruleIds: [],
        speciesIds: draft.input.speciesIds ?? [null],
        // The editor reads only speciesId, enabled, exclusions and the
        // condition columns off this; anything the template leaves out
        // reads as unset, which is what an unconfigured draft is.
        sample: draft.input as unknown as RuleGroup['sample'],
      }
    : null

  return (
    <section className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Filters
        </h1>
        <Button variant="outline" onClick={() => startFrom(BLANK_TEMPLATE)}>
          + New filter
        </Button>
      </div>
      <Tabs defaultValue="pokemon" className="mt-4">
        <TabsList>
          {/* "Filters" rather than "Pokémon": the pair of tabs answers which
              SYSTEM you are editing, per the design's reason for having them
              at all. Rule categories are a different axis and live inside
              this tab. */}
          <TabsTrigger value="pokemon">Filters</TabsTrigger>
          {/* Not wired up yet -- disabled so it reads as "not yet" rather
              than a broken tab that goes nowhere. */}
          <TabsTrigger value="alerts" disabled>
            Alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pokemon" className="mt-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                No rules yet. Start from one of these:
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Each writes a real, editable rule rather than holding a
                    preset in front of one -- the card it leaves behind is
                    the starting point, per the design spec. */}
                {STARTING_POINTS.map((template) => (
                  <Button
                    key={template.label}
                    variant="outline"
                    onClick={() => startFrom(template)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {groups.map((group) => (
                <RuleCard
                  key={group.id}
                  group={group}
                  names={names}
                  onOpen={() => setOpenGroupId(group.id)}
                  // Every member of the card, which separates nothing:
                  // the whole group moves to the same state, so there is
                  // no split for the warning to gate. Switching ONE
                  // species off is the editor's job.
                  onToggle={(enabled) => {
                    void update(group.ruleIds, { enabled })
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {(openGroup || draftGroup) && (
        // Mounted only while a group is open, and `open` fixed true, for
        // the reason `split-warning.tsx` sets out: a Radix component whose
        // `open` starts true never has to run the presence transition this
        // project's test setup cannot advance.
        <Sheet
          open
          onOpenChange={(next) => {
            if (next) return
            setOpenGroupId(null)
            setDraft(null)
          }}
        >
          <SheetContent side="right" className="gap-4 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>{(openGroup ?? draftGroup)?.name}</SheetTitle>
            </SheetHeader>
            {openGroup ? (
              <RuleEditor
                // Remounted per group, so the draft state inside never
                // carries from one rule to the next.
                key={openGroup.id}
                group={openGroup}
                names={names}
                species={species}
                onCommit={(ruleIds, patch) => {
                  void update(ruleIds, patch)
                  setOpenGroupId(null)
                }}
              />
            ) : (
              draftGroup &&
              draft && (
                <RuleEditor
                  key={`draft-${draft.label}`}
                  group={draftGroup}
                  names={names}
                  species={species}
                  isNew
                  onCommit={(_ruleIds, patch) => {
                    void create({ ...draft.input, ...patch })
                    setDraft(null)
                  }}
                  onDiscard={() => setDraft(null)}
                />
              )
            )}
          </SheetContent>
        </Sheet>
      )}
    </section>
  )
}
