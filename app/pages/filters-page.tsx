import { useMemo } from 'react'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { RuleCard } from '../rules/rule-card'
import { groupRules } from '../rules/rule-grouping'
import type { RulesClient } from '../rules/rules-query'
import { useRules } from '../rules/rules-query'
import type { MasterfileClient } from '../rules/use-names'
import { useNames } from '../rules/use-names'

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
  const { rules } = useRules(
    CURRENT_PROFILE_ID,
    rulesClient ? { client: rulesClient } : undefined,
  )
  const names = useNames(namesClient ? { client: namesClient } : undefined)
  const groups = useMemo(() => groupRules([...rules.values()]), [rules])

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
                {STARTING_POINTS.map((name) => (
                  // The sheet these open into is Task 10 -- this is only
                  // the list surfacing them as a starting point.
                  <Button key={name} variant="outline">
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {groups.map((group) => (
                <RuleCard key={group.id} group={group} names={names} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
