import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import { CREATING_LAYER_ID, useMapStore } from "../store/mapStore"
import type { StyleRecord } from "../db/types"

const DEFAULT_COLOR = "#2563eb"

interface Props {
  layerRegistry: React.RefObject<Map<string, L.Layer>>
  styles: StyleRecord[]   // ← add — pass down from MapView
}

export default function MapCreateHandler({ layerRegistry, styles }: Props) {
  const map = useMap()
  const { isCreating, createEntityKind, creatingStyleType, setPendingGeometry } = useMapStore()

  // Activate / deactivate draw mode when create state changes
  useEffect(() => {
    if (!isCreating || !createEntityKind) {
      map.pm.disableDraw()
      return
    }
    const modeMap = { area: "Polygon", road: "Line", poi: "Marker" } as const
    map.pm.enableDraw(modeMap[createEntityKind], { continueDrawing: false })
  }, [isCreating, createEntityKind, map])

  // Capture the drawn layer and store its geometry
  useEffect(() => {
    // @ts-ignore
    const handleCreate = (e) => {
      if (!isCreating) return
      const layer = e.layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature }
      
      // Apply the currently-selected style, if any
      const style = styles.find(s => s.type === creatingStyleType)
      if (style && typeof layer.setStyle === "function") {
        layer.setStyle({
          color:       style.borderColor || DEFAULT_COLOR,
          weight:      style.borderWidth ?? 2,
          dashArray:   style.dashPattern || undefined,
          fillColor:   style.fillColor   || DEFAULT_COLOR,
          fillOpacity: style.fillOpacity ?? 0.35,
        })
      } else if (style && layer instanceof L.CircleMarker) {
        // Markers from drawMarker are L.Marker, not circleMarker, so this
        // branch only applies if you ever switch POI creation to circleMarker
        layer.setStyle({ fillColor: style.fillColor, color: style.borderColor })
      }

      // Register under the temp ID so MapCustomControls can edit/drag it
      layerRegistry.current.set(CREATING_LAYER_ID, layer)
      setPendingGeometry(layer.toGeoJSON().geometry)
      // Keep the layer visible — do NOT remove it
    }
    map.on("pm:create", handleCreate)
    return () => { map.off("pm:create", handleCreate) }
  }, [map, isCreating, creatingStyleType, styles, layerRegistry, setPendingGeometry])

  return null
}