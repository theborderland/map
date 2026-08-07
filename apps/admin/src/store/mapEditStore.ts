import { create } from "zustand";
import type { Geometry } from "geojson";
import type { EntityRecord } from "../db/types";
import type { EntityKind } from "../types";
import { updateEntity } from "../db";

export type AreaEditAction = "vertices" | "dragPolygon" | "drawPolygon";
export type RoadEditAction = "editLine" | "dragLine" | "drawLine";
export type PoiEditAction = "movePOI" | "drawPOI";

/**
 * The map's editing state as a discriminated union, keyed on `status`
 * (and `kind` where relevant). This makes previously-possible invalid
 * combinations unrepresentable at the type level — e.g. "movePOI mode
 * with kind area" or "editing with no entityId" — both reachable (if
 * never intentionally produced) with the old flat
 * `{ editMode: string; editingEntityId: string | null }` shape, and had
 * to be guarded against manually in every consumer.
 */
export type MapEditState =
  | { status: "idle" }
  /** A create form (POI/Road/Area "New …") is open. `drawing` is false
   *  while waiting for the user to press "Add …", true once Geoman's
   *  draw tool is active for this session. */
  | { status: "creating"; kind: EntityKind; drawing: boolean }
  | { status: "editing"; kind: "area"; entityId: string; action: AreaEditAction }
  | { status: "editing"; kind: "road"; entityId: string; action: RoadEditAction }
  | { status: "editing"; kind: "poi"; entityId: string; action: PoiEditAction };

/**
 * True whenever navigation/selection should be blocked because geometry
 * is potentially mid-change: actively editing an existing entity, or
 * actively drawing a brand new one. Creating-but-not-yet-drawing does
 * NOT lock — the user can still freely navigate away from an empty
 * create form. This single function replaces the `editMode !== "idle"`
 * check that used to be re-derived (correctly, but redundantly) in
 * LeftPanel, MapView, and useEntityDetailForm.
 */
export function isLocked(state: MapEditState): boolean {
  if (state.status === "idle") return false;
  if (state.status === "creating") return state.drawing;
  return true;
}

type EntitiesSetter = React.Dispatch<React.SetStateAction<EntityRecord[]>>;

interface MapEditStore {
  state: MapEditState;

  /** Written on every vertex drag/draw event. Only ever read imperatively
   *  via getState() — never selected reactively — so these frequent
   *  writes never trigger a re-render anywhere. */
  pendingGeometry: Geometry | null;
  setPendingGeometry: (g: Geometry | null) => void;

  /** Set right before a draw session's cleanup runs, so
   *  MapEditController can tell whether it ended via Save or Cancel. */
  draftAction: "save" | "cancel" | null;
  resetDraftAction: () => void;

  // Bound once by App on mount so store actions can update app-level
  // entity state without every consumer needing these passed as props.
  _setEntities: EntitiesSetter | null;
  _bumpMapKey: (() => void) | null;
  bindEntityCallbacks: (setEntities: EntitiesSetter, bumpMapKey: () => void) => void;

  /** Called by App whenever the active PanelView implies a create flow
   *  (or doesn't). Drives entering/leaving the "creating" status. */
  setCreatingKind: (kind: EntityKind | null) => void;

  startEdit(entityId: string, kind: "area", action: AreaEditAction): void;
  startEdit(entityId: string, kind: "road", action: RoadEditAction): void;
  startEdit(entityId: string, kind: "poi", action: PoiEditAction): void;

  /** Transitions a "creating, not yet drawing" session into "drawing". */
  startCreateDraw: () => void;

  saveGeometry: () => Promise<void>;
  cancelEdit: () => void;
}

export const useMapEditStore = create<MapEditStore>((set, get) => ({
  state: { status: "idle" },
  pendingGeometry: null,
  draftAction: null,

  _setEntities: null,
  _bumpMapKey: null,
  bindEntityCallbacks: (setEntities, bumpMapKey) =>
    set({ _setEntities: setEntities, _bumpMapKey: bumpMapKey }),

  setPendingGeometry: (g) => set({ pendingGeometry: g }),
  resetDraftAction: () => set({ draftAction: null }),

  setCreatingKind: (kind) =>
    set((s) => {
      if (kind === null) {
        // Leaving a create view. If a draw session was active this
        // shouldn't happen (navigation is locked while drawing) — but
        // fail safe to idle rather than leaving a stale "creating" status.
        return s.state.status === "creating" ? { state: { status: "idle" } } : {};
      }
      if (s.state.status === "creating" && s.state.kind === kind) return {};
      return { state: { status: "creating", kind, drawing: false } };
    }),

  startEdit: ((entityId: string, kind: EntityKind, action: string) => {
    set({
      pendingGeometry: null,
      state: { status: "editing", kind, entityId, action } as MapEditState,
    });
  }) as MapEditStore["startEdit"],

  startCreateDraw: () =>
    set((s) =>
      s.state.status === "creating"
        ? { state: { status: "creating", kind: s.state.kind, drawing: true } }
        : {}
    ),

  // Persists pending geometry for an existing entity. For a brand new
  // entity there's nothing to persist yet — the form's own Save/Create
  // does that once the rest of its fields are filled in.
  saveGeometry: async () => {
    set({ draftAction: "save" });
    const { pendingGeometry, state, _setEntities, _bumpMapKey } = get();

    if (state.status === "editing" && pendingGeometry) {
      const updated = await updateEntity(state.entityId, { geometry: pendingGeometry });
      _setEntities?.((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      _bumpMapKey?.();
      set({ pendingGeometry: null });
    }

    set((s) => {
      if (s.state.status === "creating") {
        // Return to "waiting" — user can add more shapes before finalizing.
        return { state: { status: "creating", kind: s.state.kind, drawing: false } };
      }
      return { state: { status: "idle" } };
    });
  },

  cancelEdit: () => {
    set({ draftAction: "cancel" });
    const { state } = get();

    if (state.status === "editing") {
      set({ pendingGeometry: null, state: { status: "idle" } });
    } else if (state.status === "creating") {
      // MapEditController's cleanup restores pendingGeometry to the
      // pre-session snapshot — don't touch it here.
      set({ state: { status: "creating", kind: state.kind, drawing: false } });
    } else {
      set({ state: { status: "idle" } });
    }
  },
}));

// ── Convenience selector hooks ───────────────────────────────

export function useIsEditingLocked(): boolean {
  return useMapEditStore((s) => isLocked(s.state));
}

export function useEditingEntityId(): string | null {
  return useMapEditStore((s) => (s.state.status === "editing" ? s.state.entityId : null));
}

export function useCreatingKind(): EntityKind | null {
  return useMapEditStore((s) => (s.state.status === "creating" ? s.state.kind : null));
}