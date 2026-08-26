/**
 * The Alerts tab's account-level controls: the master switch, and the
 * profile a Poracle write lands in when a rule does not name one.
 *
 * `profile_no` is a column on every monster row (`AlertRow.profileNo`), and
 * Poracle's per-type list defaults to a human's *active* profile -- the tab
 * only sees every profile's rules at once because `alerts-router.ts`'s
 * snapshot reads with `all_profiles=true`. Without this panel there is no
 * way to change which profile is active, so a write with no explicit
 * profile always lands in whichever one happened to be active, silently.
 *
 * Presentational, like `AlertCard` and `AlertEditor`: every write is a
 * callback prop, and `AlertsPage` supplies them from `useAlerts`, which owns
 * the query cache. This component reads `human` and `profiles` off props
 * rather than fetching anything itself, so a caller controls exactly when
 * they are current.
 *
 * `onCopyProfileRules` is named for what Poracle's endpoint actually does:
 * it replaces the destination profile's tracking rules with a copy of the
 * source's. There is no "duplicate this profile" operation on Poracle's
 * side -- the destination must already exist, and whatever it was tracking
 * before is gone. `store.HumanStore.CopyProfile` runs, per tracking table, a
 * `DELETE ... WHERE profile_no = toProfile` before its `SELECT ... WHERE
 * profile_no = fromProfile`: a self-copy (`from === to`) deletes the
 * profile's rules and then finds nothing left to put back, silently. That
 * case is refused outright below rather than merely discouraged -- both here
 * and, more importantly, in `alerts-router.ts`'s `copyProfileRules`, since a
 * refusal a client can bypass is not a refusal. Both destructive actions in
 * this panel -- copying rules and deleting a profile -- confirm before
 * calling their prop, the same `AlertDialog`-mounted-only-while-pending
 * pattern `split-warning.tsx` uses and for the same reason: there is no undo
 * on Poracle's side.
 */

import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/ui/native-select'
import { Switch } from '../components/ui/switch'
import type { HumanView, ProfileView } from './alerts-query'

export interface HumanPanelProps {
  human: HumanView
  profiles: ProfileView[]
  onSetEnabled: (enabled: boolean) => void
  onSwitchProfile: (profileNo: number) => void
  onAddProfile: (name: string) => void
  onDeleteProfile: (profileNo: number) => void
  onCopyProfileRules: (fromProfileNo: number, toProfileNo: number) => void
}

function profileName(profiles: ProfileView[], profileNo: number): string {
  return profiles.find((p) => p.profileNo === profileNo)?.name ?? 'that profile'
}

export function HumanPanel({
  human,
  profiles,
  onSetEnabled,
  onSwitchProfile,
  onAddProfile,
  onDeleteProfile,
  onCopyProfileRules,
}: HumanPanelProps) {
  // Uncontrolled on purpose: this field is read once, at the moment "Add
  // profile" is clicked, and there is nothing else on screen that needs to
  // react to every keystroke. A controlled `value`/`onChange` pair would
  // work identically in a browser, but this repo's happy-dom test harness
  // does not dispatch the native `input` event React's controlled inputs
  // listen for (`filters-page.test.tsx` hits the same gap and works around
  // it by avoiding typing entirely) -- reading the DOM value directly
  // through a ref sidesteps that rather than leaving this one form
  // untestable.
  const newProfileNameRef = useRef<HTMLInputElement>(null)

  // `fromProfileNo` defaults to the active profile -- a reasonable starting
  // *source*. `toProfileNo` starts unselected (`''`) rather than mirroring
  // it: defaulting both to the same profile once made "click Copy rules
  // without touching either dropdown" the single most likely first
  // interaction with this control, and a self-copy silently deletes
  // everything in it (see the module comment). An unselected destination
  // keeps the button disabled until a person has actually chosen one.
  const [fromProfileNo, setFromProfileNo] = useState(human.currentProfileNo)
  const [toProfileNo, setToProfileNo] = useState<number | ''>('')
  const [pendingCopy, setPendingCopy] = useState<{
    fromProfileNo: number
    toProfileNo: number
  } | null>(null)
  const [pendingDeleteProfileNo, setPendingDeleteProfileNo] = useState<
    number | null
  >(null)

  const copyDisabled = toProfileNo === '' || toProfileNo === fromProfileNo

  function addProfile() {
    const name = newProfileNameRef.current?.value.trim() ?? ''
    if (!name) return
    onAddProfile(name)
    if (newProfileNameRef.current) newProfileNameRef.current.value = ''
  }

  function requestCopy() {
    if (copyDisabled) return
    setPendingCopy({ fromProfileNo, toProfileNo })
  }

  function confirmCopy() {
    if (pendingCopy)
      onCopyProfileRules(pendingCopy.fromProfileNo, pendingCopy.toProfileNo)
    setPendingCopy(null)
  }

  function confirmDelete() {
    if (pendingDeleteProfileNo !== null) onDeleteProfile(pendingDeleteProfileNo)
    setPendingDeleteProfileNo(null)
  }

  // Roving tabindex for the profile listbox: only the active profile (or,
  // once focus has moved off it, whichever option last received focus) is a
  // tab stop, and the arrow keys move focus between the rest -- the keyboard
  // behaviour the `listbox`/`option` roles promise, which plain buttons in a
  // `div` do not get for free.
  const optionRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  function focusOptionAt(index: number) {
    const profile = profiles[(index + profiles.length) % profiles.length]
    if (profile) optionRefs.current[profile.profileNo]?.focus()
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOptionAt(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusOptionAt(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOptionAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOptionAt(profiles.length - 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="alerts-enabled">Alerts enabled</Label>
          <Switch
            id="alerts-enabled"
            checked={human.enabled}
            onCheckedChange={onSetEnabled}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Profile</span>
          <div
            role="listbox"
            aria-label="Profiles"
            className="flex flex-col gap-1"
          >
            {profiles.map((profile, index) => (
              <div
                key={profile.profileNo}
                className="flex items-center justify-between gap-2"
              >
                <button
                  ref={(el) => {
                    optionRefs.current[profile.profileNo] = el
                  }}
                  type="button"
                  role="option"
                  aria-selected={profile.profileNo === human.currentProfileNo}
                  tabIndex={
                    profile.profileNo === human.currentProfileNo ? 0 : -1
                  }
                  className="flex-1 rounded-md px-2 py-1 text-left text-sm hover:bg-muted aria-selected:font-semibold"
                  onClick={() => onSwitchProfile(profile.profileNo)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  {profile.name}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete profile ${profile.name}`}
                  onClick={() => setPendingDeleteProfileNo(profile.profileNo)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              ref={newProfileNameRef}
              aria-label="New profile name"
              defaultValue=""
            />
            <Button type="button" variant="outline" onClick={addProfile}>
              Add profile
            </Button>
          </div>
        </div>

        {profiles.length > 1 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              Copy rules -- permanently replaces every rule in the destination
              profile
            </span>
            <div className="flex items-center gap-2">
              <NativeSelect
                aria-label="Copy rules from"
                value={fromProfileNo}
                onChange={(event) => {
                  // Also clears a destination that the new source would
                  // now collide with -- the "into" list below already
                  // filters that profile out of its own options, so a
                  // stale selection would otherwise point at an option
                  // that no longer renders.
                  const next = Number(event.target.value)
                  setFromProfileNo(next)
                  setToProfileNo((current) => (current === next ? '' : current))
                }}
              >
                {profiles.map((profile) => (
                  <NativeSelectOption
                    key={profile.profileNo}
                    value={profile.profileNo}
                  >
                    {profile.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                aria-label="Copy rules into"
                value={toProfileNo}
                onChange={(event) =>
                  setToProfileNo(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
              >
                <NativeSelectOption value="">
                  Choose a destination
                </NativeSelectOption>
                {profiles
                  .filter((profile) => profile.profileNo !== fromProfileNo)
                  .map((profile) => (
                    <NativeSelectOption
                      key={profile.profileNo}
                      value={profile.profileNo}
                    >
                      {profile.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <Button
                type="button"
                variant="outline"
                disabled={copyDisabled}
                onClick={requestCopy}
              >
                Copy rules
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {pendingCopy && (
        // Mounted only while a copy is pending, not driven by a persistent
        // `open` prop -- see `split-warning.tsx`'s own comment on why: this
        // project's test setup registers `document` after every module's
        // top-level imports resolve Radix's Portal-mount gate, which
        // permanently no-ops the open/close transition for the whole `bun
        // test` process. A dialog whose `open` is `true` on its first
        // render starts mounted directly, no transition required.
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingCopy(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Replace rules in this profile?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {`This permanently replaces every rule in ${profileName(profiles, pendingCopy.toProfileNo)} with a copy of ${profileName(profiles, pendingCopy.fromProfileNo)}'s. This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingCopy(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmCopy}>
                Copy rules
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {pendingDeleteProfileNo !== null && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDeleteProfileNo(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
              <AlertDialogDescription>
                {`This deletes ${profileName(profiles, pendingDeleteProfileNo)} and every tracking rule in it. This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setPendingDeleteProfileNo(null)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  )
}
