/**
 * The one piece of interface the storage model makes mandatory (see the
 * filters design spec's "The split warning"). Every rule in a group is a
 * separate row sharing everything but its subject; a condition or
 * appearance change on one member therefore either rewrites every row in
 * the group identically, or peels the edited member into its own row.
 * Nothing in the schema can express "this field differs for one member
 * of an otherwise-shared row", so a change on a group larger than one
 * always means the latter, and the person making it has to know that
 * before it happens.
 *
 * This component owns only the gate, never the field being changed: it
 * renders whatever `children` gives it, handing back an `attemptChange`
 * callback that either commits immediately (a group of one has nothing
 * to separate from) or opens the warning first. The caller decides what
 * "commit" means -- writing to `useRules().update` is Task 12+'s wiring,
 * not this component's.
 */

import type { ReactNode } from 'react'
import { useState } from 'react'
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
import type { RulePatch } from './rules-query'

export interface SplitWarningProps {
  /** How many rows belong to the group the change would apply to. */
  groupSize: number
  /**
   * The one member being singled out by this edit -- a species name, or
   * "Any Pokémon" for an unrestricted subject. Named in the warning
   * rather than the group, since the group keeps its name either way.
   */
  editingLabel: string
  /**
   * Called once the change is safe to apply: immediately for a group of
   * one, after the person confirms otherwise. Never called at all if
   * they cancel.
   */
  onCommit?: (patch: RulePatch) => void
  /** Renders the actual control; `attemptChange` replaces a direct `onCommit` call. */
  children: (attemptChange: (patch: RulePatch) => void) => ReactNode
}

export function SplitWarning({
  groupSize,
  editingLabel,
  onCommit,
  children,
}: SplitWarningProps) {
  const [pendingPatch, setPendingPatch] = useState<RulePatch | null>(null)

  function attemptChange(patch: RulePatch) {
    if (groupSize > 1) {
      setPendingPatch(patch)
    } else {
      onCommit?.(patch)
    }
  }

  function cancel() {
    setPendingPatch(null)
  }

  function confirm() {
    if (pendingPatch) onCommit?.(pendingPatch)
    setPendingPatch(null)
  }

  return (
    <>
      {children(attemptChange)}
      {pendingPatch !== null && (
        // `open` is fixed at `true` rather than driven by state on a
        // persistent `AlertDialog` instance: Radix's open/close transition
        // resolves through `@radix-ui/react-presence`'s state machine,
        // which advances in a `useLayoutEffect` -- and this project's test
        // setup (`test-setup.ts`) registers `document` after every
        // module's top-level imports have already run, which permanently
        // turns that effect into a no-op for the whole `bun test` process
        // (see `alert-dialog.tsx`'s `AlertDialogPortal` for the matching
        // Portal-side issue). Mounting a fresh `AlertDialog` only while
        // there is a pending patch sidesteps the state machine entirely:
        // a component whose `open` prop is `true` on its very first render
        // starts in the "mounted" state directly, no transition required.
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) cancel()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Separate {editingLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                {`This will separate ${editingLabel} from the other ${groupSize - 1}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirm}>Separate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
