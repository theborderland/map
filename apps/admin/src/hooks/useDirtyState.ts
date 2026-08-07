import { useState } from "react";

/**
 * Tracks whether `values` differs from a baseline snapshot, resetting the
 * baseline whenever `commit()` is called (i.e. right after a successful
 * save). Used to keep a Save button disabled until something actually
 * changed, and to re-disable it immediately after saving.
 *
 * Compares by JSON serialization — fine for the flat, small field sets
 * these forms use (strings/numbers/booleans/simple nested objects like
 * styleOverride). Field order must stay consistent between calls, which
 * holds naturally since `values` is always built from the same object
 * literal shape at each call site.
 */
export function useDirtyState<T>(initial: T) {
  const [baseline, setBaseline] = useState(initial);

  const isDirty = (values: T) => JSON.stringify(values) !== JSON.stringify(baseline);

  /** Call after a successful save with the just-saved values. */
  const commit = (values: T) => setBaseline(values);

  return { isDirty, commit };
}