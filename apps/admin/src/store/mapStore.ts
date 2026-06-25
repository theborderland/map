import { create } from 'zustand'

interface MapStore {
  isEditing: boolean
  pendingGeometry: GeoJSON.Geometry | null
  originalGeometry: GeoJSON.Geometry | null
  startEditing: (geometry: GeoJSON.Geometry) => void
  /** Keep entity and stop editing */
  stopEditing: () => void
  /** Restore entity and stop editing */
  cancelEditing: () => void
  setPendingGeometry: (g: GeoJSON.Geometry | null) => void
  canChangeSelection: () => boolean
}

export const useMapStore = create<MapStore>((set, get) => ({
  isEditing: false,
  pendingGeometry: null,
  originalGeometry: null,

  startEditing: (geometry) => set({
    isEditing: true,
    pendingGeometry: null,
    originalGeometry: geometry, // snapshot taken here so we can restore if user cancels editing
  }),
  stopEditing: () => set({
    isEditing: false,
    pendingGeometry: null,
    originalGeometry: null,
  }),
  cancelEditing: () => set({
    isEditing: false,
    pendingGeometry: null,
    // originalGeometry intentionally kept — MapCustomControls reads it to restore
    // It gets cleared in the next startEditing() call
  }),

  setPendingGeometry: (g) => set({ pendingGeometry: g }),
  canChangeSelection: () => !get().isEditing,
}))