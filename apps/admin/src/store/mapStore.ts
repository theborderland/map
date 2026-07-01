import { create } from "zustand";

/** Temp registry key used while a new entity is being drawn on the map. */
export const CREATING_LAYER_ID = "__creating__";

interface MapStore {
  isEditing: boolean;
  isCreating: boolean;
  createEntityKind: "area" | "road" | "poi" | null;
  pendingGeometry: GeoJSON.Geometry | null;
  originalGeometry: GeoJSON.Geometry | null;
  creatingStyleType: string | null;

  setCreatingStyleType: (type: string | null) => void;
  startEditing: (geometry: GeoJSON.Geometry) => void;
  startCreating: (kind: "area" | "road" | "poi") => void;
  stopEditing: () => void;
  cancelEditing: () => void;
  setPendingGeometry: (g: GeoJSON.Geometry | null) => void;
  canChangeSelection: () => boolean;
}

export const useMapStore = create<MapStore>((set, get) => ({
  isEditing: false,
  isCreating: false,
  createEntityKind: null,
  pendingGeometry: null,
  originalGeometry: null,
  creatingStyleType: null,

  startEditing: (geometry) => set({
    isEditing: true,
    isCreating: false,
    createEntityKind: null,
    pendingGeometry: null,
    originalGeometry: geometry,
  }),

  startCreating: (kind) => set({
    isEditing: true,
    isCreating: true,
    createEntityKind: kind,
    pendingGeometry: null,
    originalGeometry: null,  // nothing to restore on cancel
    // creatingStyleType intentionally NOT reset here — set separately by the form
  }),

  stopEditing: () => set({
    isEditing: false,
    isCreating: false,
    createEntityKind: null,
    pendingGeometry: null,
    originalGeometry: null,
    creatingStyleType: null,   // clear on stop
  }),

  cancelEditing: () => set({
    isEditing: false,
    isCreating: false,
    createEntityKind: null,
    pendingGeometry: null,
    // originalGeometry kept — MapCustomControls reads it to restore on edit cancel
    creatingStyleType: null,   // clear on cancel
  }),

  setPendingGeometry: (g) => set({ pendingGeometry: g }),
  canChangeSelection: () => !get().isEditing,
  setCreatingStyleType: (type) => set({ creatingStyleType: type }),
}));