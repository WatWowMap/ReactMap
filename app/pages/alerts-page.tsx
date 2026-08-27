import { useState } from 'react'
import { AlertCard } from '../alerts/alert-card'
import { AlertEditor } from '../alerts/alert-editor'
import type { AlertsClient, AlertWriteInput } from '../alerts/alerts-query'
import { useAlerts } from '../alerts/alerts-query'
import { HumanPanel } from '../alerts/human-panel'
import { Button } from '../components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet'
import type { AlertRow } from '../rules/poracle-vocabulary'
import type { SpeciesSelection } from '../rules/species-picker'
import { SpeciesPicker } from '../rules/species-picker'
import type { MasterfileClient } from '../rules/use-names'
import { useNames, useSpeciesCatalog } from '../rules/use-names'

export interface AlertsPageProps {
  /** Test seam: a fake in place of the default tRPC-backed client. */
  alertsClient?: AlertsClient
  /** Test seam: a fake in place of the default tRPC-backed client. */
  namesClient?: MasterfileClient
}

/**
 * The species picker's own selection shape, collapsed to what `alerts.
 * create` needs: `pokemonId` off a bare species pick, `pokemonId` plus
 * `form` off a form pick. Poracle's `form` is `0` for "no specific form"
 * (`alertRuleShape`'s `filter`), matching what an unpicked `AlertRow.form`
 * already reads as, so a bare species pick simply omits the field rather
 * than sending a sentinel.
 */
function toNewAlertInput(pick: SpeciesSelection): AlertWriteInput {
  return typeof pick === 'number'
    ? { pokemonId: pick }
    : { pokemonId: pick.speciesId, form: pick.formId }
}

/**
 * Three states, rendered as three different things -- the design's whole
 * point for this tab. `present` with alerts is the card list; `present`
 * with none says the list is empty, which is a claim about someone's
 * subscriptions; `unreachable` says Poracle is not answering instead,
 * which is a claim about the connection, and the two must never look the
 * same. `absent` and `unconfigured` render nothing here -- `absent`
 * because the nav has already hidden this tab (`bottom-nav.tsx`) and a
 * direct visit has nothing to show either; `unconfigured` because the
 * operator has set no Poracle at all. `loading` renders nothing rather
 * than a placeholder that would flash before the real state lands.
 */
export function AlertsPage({
  alertsClient,
  namesClient,
}: AlertsPageProps = {}) {
  const {
    state,
    snapshot,
    error,
    create,
    replace,
    remove,
    setEnabled,
    switchProfile,
    addProfile,
    deleteProfile,
    copyProfileRules,
    availableAreas,
    setAreas,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useAlerts(alertsClient ? { client: alertsClient } : undefined)
  const namesOptions = namesClient ? { client: namesClient } : undefined
  const species = useSpeciesCatalog(namesOptions)
  const names = useNames(namesOptions)

  // Which alert's sheet is open, by uid rather than the row itself, so a
  // save that changes the row's shape (`replace` adopts a new uid) never
  // leaves a stale copy of it on screen -- same reasoning as
  // `filters-page.tsx`'s `openGroupId`.
  const [openUid, setOpenUid] = useState<number | null>(null)
  const openAlert =
    snapshot?.alerts.find((alert) => alert.uid === openUid) ?? null

  // Whether the species picker for a brand-new alert is open. A Poracle
  // rule has no "Any Pokémon" subject the way a ReactMap rule does --
  // `pokemonId` is required (`alertRuleShape`) -- so, unlike
  // `filters-page.tsx`'s `startFrom`, there is no fixed template to write
  // immediately; the species has to be picked first.
  const [pickingSpecies, setPickingSpecies] = useState(false)

  // A picked species becomes a draft, not a row. An alert with no
  // conditions matches every spawn of that species, so writing one the
  // instant a species is chosen is a notification flood nobody asked for.
  // Nothing reaches Poracle until Save.
  const [draft, setDraft] = useState<AlertWriteInput | null>(null)

  function pickSpecies(selection: SpeciesSelection[]) {
    const picked = selection.at(-1)
    if (picked === undefined) return
    setDraft(toNewAlertInput(picked))
    setPickingSpecies(false)
  }

  if (state === 'loading' || state === 'unconfigured' || state === 'absent') {
    return null
  }

  return (
    <section className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Alerts
        </h1>
        {state === 'present' && (
          <Button variant="outline" onClick={() => setPickingSpecies(true)}>
            + New alert
          </Button>
        )}
      </div>
      {error !== null && (
        // `role="alert"` so a screen reader announces it the moment a
        // write fails -- a click that silently did nothing was the bug
        // this exists to fix, and a message nobody hears is the same bug
        // with extra steps.
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : 'That request failed. Try again.'}
        </p>
      )}
      {state === 'unreachable' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Poracle is unreachable right now. Your alerts will show again once it
          is back.
        </p>
      ) : (
        snapshot && (
          <>
            <div className="mt-4">
              <HumanPanel
                human={snapshot.human}
                profiles={snapshot.profiles}
                locations={snapshot.locations}
                availableAreas={availableAreas}
                onSetEnabled={(enabled) => void setEnabled(enabled)}
                onSwitchProfile={(profileNo) => void switchProfile(profileNo)}
                onAddProfile={(name) => void addProfile(name)}
                onDeleteProfile={(profileNo) => void deleteProfile(profileNo)}
                onCopyProfileRules={(fromProfileNo, toProfileNo) =>
                  void copyProfileRules(fromProfileNo, toProfileNo)
                }
                onSetAreas={(areas) => void setAreas(areas)}
                onAddLocation={(label, latitude, longitude) =>
                  void addLocation(label, latitude, longitude)
                }
                onUpdateLocation={(label, latitude, longitude) =>
                  void updateLocation(label, latitude, longitude)
                }
                onDeleteLocation={(label) => void deleteLocation(label)}
              />
            </div>
            {snapshot.alerts.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {snapshot.alerts.map((alert) => (
                  <AlertCard
                    key={alert.uid}
                    alert={alert}
                    names={names}
                    onOpen={() => setOpenUid(alert.uid)}
                    onDelete={() => void remove(alert.uid)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No alerts yet.
              </p>
            )}
          </>
        )
      )}

      {(openAlert || draft) && (
        // `open` fixed true, mounted only while an alert is open -- the
        // reason `filters-page.tsx`'s sheet does the same: a Radix
        // component whose `open` starts true never has to run the
        // presence transition this project's test setup cannot advance.
        <Sheet
          open
          onOpenChange={(next) => {
            if (next) return
            setOpenUid(null)
            setDraft(null)
          }}
        >
          <SheetContent side="right" className="gap-4 overflow-y-auto p-6">
            {/*
             * The sheet's visible heading is `SpeciesHeader`, inside the
             * editor: sprite, name and form, plus the sentence the rule
             * currently reads as. Radix still needs a `SheetTitle` for the
             * dialog's accessible name, so this one carries the name and
             * nothing draws it twice.
             */}
            <SheetHeader className="sr-only p-0">
              <SheetTitle>
                {names.label(
                  (openAlert?.pokemonId ?? draft?.pokemonId) as number,
                  openAlert?.form ?? draft?.form ?? null,
                )}
              </SheetTitle>
            </SheetHeader>
            {openAlert ? (
              <AlertEditor
                // Remounted per alert, so the draft never carries from one
                // row to the next.
                key={openAlert.uid}
                alert={openAlert}
                names={names}
                onSave={(patch) => {
                  void replace(openAlert.uid, patch)
                  setOpenUid(null)
                }}
                onDelete={() => {
                  void remove(openAlert.uid)
                  setOpenUid(null)
                }}
              />
            ) : (
              draft && (
                <AlertEditor
                  isNew
                  // The species is the draft's identity; picking a
                  // different one starts a different draft.
                  key={`draft-${draft.pokemonId}`}
                  alert={draft as unknown as AlertRow}
                  names={names}
                  onSave={(patch) => {
                    void create({ ...draft, ...patch })
                    setDraft(null)
                  }}
                  onDelete={() => setDraft(null)}
                />
              )
            )}
          </SheetContent>
        </Sheet>
      )}

      {pickingSpecies && (
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setPickingSpecies(false)
          }}
        >
          <SheetContent side="right" className="gap-4 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>New alert</SheetTitle>
            </SheetHeader>
            <SpeciesPicker species={species} onChange={pickSpecies} />
          </SheetContent>
        </Sheet>
      )}
    </section>
  )
}
