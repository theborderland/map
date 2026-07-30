import { create } from "zustand";
import type { Geometry } from "geojson";
import type { EditMode, EntityKind } from "../types";
import { CREATE_DRAW_MODE_BY_KIND } from "../types";
import type { EntityRecord } from "../db/types";
import { updateEntity } from "../db";

type EntitiesSetter = React.Dispatch<React.SetStateAction<EntityRecord[]>>;

interface MapEditState {
  editMode: EditMode;
  editingEntityId: string | null;
  creatingKind: EntityKind | null;
  /** Written on every vertex drag/draw event. Never subscribed to via the
   *  hook — only read imperatively via getState() — so these frequent
   *  writes never trigger a re-render anywhere. */
  pendingGeometry: Geometry | null;
  /** Set right before flipping editMode, so MapEditController's cleanup
   *  can tell whether a draw session ended via Save or Cancel. */
  draftAction: "save" | "cancel" | null;

  // Bound once by App on mount so store actions can update app-level
  // entity state without every consumer needing these passed as props.
  _setEntities: EntitiesSetter | null;
  _bumpMapKey: (() => void) | null;
  bindEntityCallbacks: (setEntities: EntitiesSetter, bumpMapKey: () => void) => void;

  setCreatingKind: (kind: EntityKind | null) => void;
  setPendingGeometry: (g: Geometry | null) => void;
  resetDraftAction: () => void;

  startEdit: (entityId: string, mode: Exclude<EditMode, "idle">) => void;
  startCreateDraw: () => void;
  saveGeometry: () => Promise<void>;
  cancelEdit: () => void;
}

export const useMapEditStore = create<MapEditState>((set, get) => ({
  editMode: "idle",
  editingEntityId: null,
  creatingKind: null,
  pendingGeometry: null,
  draftAction: null,

  _setEntities: null,
  _bumpMapKey: null,
  bindEntityCallbacks: (setEntities, bumpMapKey) =>
    set({ _setEntities: setEntities, _bumpMapKey: bumpMapKey }),

  setCreatingKind: (kind) => set({ creatingKind: kind }),
  setPendingGeometry: (g) => set({ pendingGeometry: g }),
  resetDraftAction: () => set({ draftAction: null }),

  startEdit: (entityId, mode) =>
    set({ pendingGeometry: null, editingEntityId: entityId, editMode: mode }),

  startCreateDraw: () => {
    const { creatingKind } = get();
    if (!creatingKind) return;
    set({ editingEntityId: null, editMode: CREATE_DRAW_MODE_BY_KIND[creatingKind] });
  },

  // Persists pending geometry for an existing entity. For a brand new
  // entity (editingEntityId null) the geometry stays in pendingGeometry —
  // there's nothing to persist yet, the form's own Save/Create does that.
  saveGeometry: async () => {
    set({ draftAction: "save" });
    const { pendingGeometry, editingEntityId, _setEntities, _bumpMapKey } = get();
    if (pendingGeometry && editingEntityId) {
      const updated = await updateEntity(editingEntityId, { geometry: pendingGeometry });
      _setEntities?.((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      _bumpMapKey?.();
      set({ pendingGeometry: null });
    }
    set({ editMode: "idle", editingEntityId: null });
  },

  cancelEdit: () => {
    set({ draftAction: "cancel" });
    const { editingEntityId } = get();
    if (editingEntityId) set({ pendingGeometry: null });
    set({ editMode: "idle", editingEntityId: null });
  },
}));