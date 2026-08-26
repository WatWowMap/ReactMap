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
 * before is gone. The copy control below says so.
 */

import { useRef, useState } from 'react'
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
  // Copy defaults to "into the active profile", the one shape of this
  // control where getting it wrong by accident (never touching the selects)
  // still does nothing: `from` and `to` land on the same profile.
  const [fromProfileNo, setFromProfileNo] = useState(human.currentProfileNo)
  const [toProfileNo, setToProfileNo] = useState(human.currentProfileNo)

  function addProfile() {
    const name = newProfileNameRef.current?.value.trim() ?? ''
    if (!name) return
    onAddProfile(name)
    if (newProfileNameRef.current) newProfileNameRef.current.value = ''
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
            {profiles.map((profile) => (
              <div
                key={profile.profileNo}
                className="flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={profile.profileNo === human.currentProfileNo}
                  className="flex-1 rounded-md px-2 py-1 text-left text-sm hover:bg-muted aria-selected:font-semibold"
                  onClick={() => onSwitchProfile(profile.profileNo)}
                >
                  {profile.name}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete profile ${profile.name}`}
                  onClick={() => onDeleteProfile(profile.profileNo)}
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
              Copy rules -- replaces every rule in the destination profile
            </span>
            <div className="flex items-center gap-2">
              <NativeSelect
                aria-label="Copy rules from"
                value={fromProfileNo}
                onChange={(event) =>
                  setFromProfileNo(Number(event.target.value))
                }
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
                onChange={(event) => setToProfileNo(Number(event.target.value))}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onCopyProfileRules(fromProfileNo, toProfileNo)}
              >
                Copy rules
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
