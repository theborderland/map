import { useMap } from "react-leaflet"
import { useMapStore, CREATING_LAYER_ID } from "../store/mapStore"
import { useEffect, useRef } from "react"
import L from "leaflet"

const BUTTONS = {
  EDIT_SHAPE:   "editVertices-custom",
  MOVE_SHAPE:   "dragSelected-custom",
  DELETE_SHAPE: "deleteSelected-custom",
}

type GeomanLayer = L.Layer & {
  pm: {
    enable:           (opts?: { allowSelfIntersection?: boolean }) => void
    disable:          () => void
    enableLayerDrag:  () => void
    disableLayerDrag: () => void
  }
  toGeoJSON: () => GeoJSON.Feature
}

export default function MapCustomControls({
  selectedEntityId,
  layerRegistry,
}: {
  selectedEntityId: string | null
  layerRegistry: React.RefObject<Map<string, L.Layer>>
}) {
  const map = useMap()
  const { isEditing, isCreating, originalGeometry, setPendingGeometry } = useMapStore()
  const activeMode   = useRef<"vertices" | "drag" | null>(null)
  const wasCreating  = useRef(false)

  // Track whether we entered create mode so the cleanup knows what to do
  useEffect(() => {
    if (isCreating) wasCreating.current = true
  }, [isCreating])

  // Always-current ref so button onClick closures never go stale
  const ref = useRef({ selectedEntityId, layerRegistry, setPendingGeometry, isCreating })
  useEffect(() => {
    ref.current = { selectedEntityId, layerRegistry, setPendingGeometry, isCreating }
  })

  // Resolve the layer to operate on:
  //   - edit mode  → the selected entity's registered layer
  //   - create mode → the temp layer drawn by MapCreateHandler
  const getEffectiveLayer = (): GeomanLayer | undefined => {
    const { selectedEntityId: id, layerRegistry: reg, isCreating: creating } = ref.current
    const effectiveId = id ?? (creating ? CREATING_LAYER_ID : null)
    return effectiveId ? reg.current.get(effectiveId) as GeomanLayer | undefined : undefined
  }

  // ── Cleanup when editing ends (save or cancel) ─────────
  useEffect(() => {
    if (isEditing) return

    const { layerRegistry: reg } = ref.current
    const wereCreating = wasCreating.current

    // Resolve the effective layer before wiping state
    const effectiveId = selectedEntityId ?? (wereCreating ? CREATING_LAYER_ID : null)
    const layer = effectiveId
      ? reg.current.get(effectiveId) as GeomanLayer | undefined
      : undefined

    if (layer) {
      layer.pm.disable()
      layer.pm.disableLayerDrag()
      ;(layer as L.Layer).off("pm:edit")
      ;(layer as L.Layer).off("pm:dragend")
    }

    activeMode.current = null
    map.pm.Toolbar.buttons[BUTTONS.EDIT_SHAPE]?.toggle(false)
    map.pm.Toolbar.buttons[BUTTONS.MOVE_SHAPE]?.toggle(false)

    // Remove the temp drawing layer (always, regardless of save vs cancel)
    if (wereCreating) {
      const tempLayer = reg.current.get(CREATING_LAYER_ID)
      if (tempLayer) {
        map.removeLayer(tempLayer)
        reg.current.delete(CREATING_LAYER_ID)
      }
      wasCreating.current = false
    }

    // Restore original geometry — only for edit cancel (originalGeometry is set)
    // Not for create (originalGeometry is null) or edit save (stopEditing clears it)
    if (originalGeometry && !wereCreating) {
      const geoJsonLayer = layer as unknown as L.GeoJSON
      if (typeof geoJsonLayer?.clearLayers === "function") {
        geoJsonLayer.clearLayers()
        geoJsonLayer.addData(originalGeometry as GeoJSON.GeoJsonObject)
      } else if (originalGeometry.type === "Point") {
        const coords = (originalGeometry as GeoJSON.Point).coordinates
        const marker = layer as unknown as L.CircleMarker
        marker.setLatLng(L.latLng(coords[1]!, coords[0]!))
        marker.redraw()
      } else {
        const path = layer as unknown as L.Path & {
          setLatLngs: (ll: L.LatLngExpression[] | L.LatLngExpression[][]) => void
        }
        const restored = L.geoJSON(originalGeometry)
        const rl = restored.getLayers()[0] as L.Path & {
          getLatLngs: () => L.LatLng[] | L.LatLng[][]
        }
        path.setLatLngs(rl.getLatLngs())
        path.redraw()
      }
    }
  }, [isEditing, originalGeometry])

  // ── Create toolbar buttons (once on mount) ─────────────
  useEffect(() => {
    const toolbar = map.pm.Toolbar

    if (!toolbar.buttons[BUTTONS.EDIT_SHAPE]) {
      toolbar.createCustomControl({
        name:      BUTTONS.EDIT_SHAPE,
        block:     "edit",
        title:     "Edit shape vertices",
        className: "leaflet-pm-icon-edit",
        toggle:    true,
        onClick: () => {
          const { setPendingGeometry: setGeom } = ref.current
          const layer = getEffectiveLayer()
          if (!layer?.pm) return

          if (activeMode.current === "vertices") {
            layer.pm.disable()
            ;(layer as L.Layer).off("pm:edit")
            activeMode.current = null
          } else {
            layer.pm.disableLayerDrag()
            ;(layer as L.Layer).off("pm:dragend")
            layer.pm.enable({ allowSelfIntersection: false })
            ;(layer as L.Layer).on("pm:edit", () => {
              setGeom(layer.toGeoJSON().geometry)
            })
            activeMode.current = "vertices"
          }
        },
      })
    }

    if (!toolbar.buttons[BUTTONS.MOVE_SHAPE]) {
      toolbar.createCustomControl({
        name:      BUTTONS.MOVE_SHAPE,
        block:     "edit",
        title:     "Drag shape",
        className: "leaflet-pm-icon-drag",
        toggle:    true,
        onClick: () => {
          const { setPendingGeometry: setGeom } = ref.current
          const layer = getEffectiveLayer()
          if (!layer?.pm) return

          if (activeMode.current === "drag") {
            layer.pm.disableLayerDrag()
            ;(layer as L.Layer).off("pm:dragend")
            activeMode.current = null
          } else {
            layer.pm.disable()
            ;(layer as L.Layer).off("pm:edit")
            layer.pm.enableLayerDrag()
            ;(layer as L.Layer).on("pm:dragend", () => {
              setGeom(layer.toGeoJSON().geometry)
            })
            activeMode.current = "drag"
          }
        },
      })
    }

    if (!toolbar.buttons[BUTTONS.DELETE_SHAPE]) {
      toolbar.createCustomControl({
        name:       BUTTONS.DELETE_SHAPE,
        block:      "edit",
        title:      "Delete shape",
        className:  "leaflet-pm-icon-trash",
        onClick: () => {
          const { layerRegistry: reg } = ref.current
          const layer = getEffectiveLayer()
          if (!layer) return
          map.removeLayer(layer)
          const effectiveId = ref.current.selectedEntityId ??
            (ref.current.isCreating ? CREATING_LAYER_ID : null)
          if (effectiveId) reg.current.delete(effectiveId)
        },
        afterClick: () => {
          toolbar.buttons[BUTTONS.DELETE_SHAPE].toggle(false)
        },
      })
    }

    return () => {
      try { map.pm.Toolbar.removeButton(BUTTONS.EDIT_SHAPE)  } catch { /* no-op */ }
      try { map.pm.Toolbar.removeButton(BUTTONS.MOVE_SHAPE)  } catch { /* no-op */ }
      try { map.pm.Toolbar.removeButton(BUTTONS.DELETE_SHAPE) } catch { /* no-op */ }
    }
  }, [map])

  return null
}