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

/**
 * The four canned rules a brand-new, rule-less profile can start from. A
 * fresh account never actually sees this -- `seedProfileForUser` gives it
 * an "Everything" rule already -- but a profile whose one rule was
 * deleted lands right back here, so the empty state has to be a real
 * starting point, not a dead end.
 */
const STARTING_POINTS = ['Everything', '100% IV', 'Great League', 'Rare spawns']

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
  const { rules, update } = useRules(
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

  return (
    <section className="p-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Filters
      </h1>
      <Tabs defaultValue="pokemon" className="mt-4">
        <TabsList>
          <TabsTrigger value="pokemon">Pokémon</TabsTrigger>
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
                {/* The sheet these open into is Task 10 -- this is only
                    the list surfacing them as a starting point. */}
                {STARTING_POINTS.map((name) => (
                  <Button key={name} variant="outline">
                    {name}
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
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {openGroup && (
        // Mounted only while a group is open, and `open` fixed true, for
        // the reason `split-warning.tsx` sets out: a Radix component whose
        // `open` starts true never has to run the presence transition this
        // project's test setup cannot advance.
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setOpenGroupId(null)
          }}
        >
          <SheetContent side="right" className="gap-4 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>{openGroup.name}</SheetTitle>
            </SheetHeader>
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
          </SheetContent>
        </Sheet>
      )}
    </section>
  )
}
