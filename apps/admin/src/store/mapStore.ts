import { create } from 'zustand'

interface MapStore {
  isEditing: boolean
  startEditing: () => void
  stopEditing: () => void
  pendingGeometry: GeoJSON.Geometry | null
  setPendingGeometry: (g: GeoJSON.Geometry | null) => void
  canChangeSelection: () => boolean
}

export const useMapStore = create<MapStore>((set, get) => ({
  isEditing: false,
  pendingGeometry: null,

  startEditing: () => set({ isEditing: true, pendingGeometry: null }),
  stopEditing: () => set({ isEditing: false, pendingGeometry: null }),
  setPendingGeometry: (g) => set({ pendingGeometry: g }),
  // Single place to ask "should I allow a selection change right now?"
  canChangeSelection: () => get().isEditing == false,
}))