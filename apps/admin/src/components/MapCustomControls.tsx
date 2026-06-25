import { useMap } from "react-leaflet"
import { useMapStore } from "../store/mapStore"
import { useEffect, useRef } from "react"

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
    layerRegistry: React.MutableRefObject<Map<string, L.Layer>>
}) {
    const map = useMap()
    const setPendingGeometry = useMapStore(s => s.setPendingGeometry)
    const isEditing = useMapStore(s => s.isEditing)

    // Always-current ref so Geoman button callbacks never have stale closures
    const ref = useRef({ selectedEntityId, layerRegistry, setPendingGeometry })
    useEffect(() => {
        ref.current = { selectedEntityId, layerRegistry, setPendingGeometry }
    })

    // Track active sub-mode locally — just needed for the toggle behaviour
    const activeMode = useRef<'vertices' | 'drag' | null>(null)

    // Clean up when user hits Save or Cancel
    useEffect(() => {
        if (isEditing) return
        const { selectedEntityId: id, layerRegistry: reg } = ref.current
        if (!id) return
        const layer = reg.current.get(id) as GeomanLayer | undefined
        layer?.pm.disable()
        layer?.pm.disableLayerDrag()
            ; (layer as L.Layer | undefined)?.off('pm:edit')
            ; (layer as L.Layer | undefined)?.off('pm:dragend')
        activeMode.current = null
    }, [isEditing])

    useEffect(() => {
        const toolbar = map.pm.Toolbar;

        if (!toolbar.buttons['editVertices-custom']) {
            map.pm.Toolbar.createCustomControl({
                name: 'editVertices-custom',
                block: 'edit',
                title: 'Edit vertices of shape',
                className: 'leaflet-pm-icon-edit',
                toggle: true,
                onClick: () => {
                    const { selectedEntityId: id, layerRegistry: reg, setPendingGeometry: setGeom } = ref.current
                    if (!id) return
                    const layer = reg.current.get(id) as GeomanLayer | undefined
                    if (!layer?.pm) return

                    if (activeMode.current === 'vertices') {
                        layer.pm.disable()
                            ; (layer as L.Layer).off('pm:edit')
                        activeMode.current = null
                    } else {
                        // Switch from drag if active
                        layer.pm.disableLayerDrag()
                            ; (layer as L.Layer).off('pm:dragend')
                        // Enable vertices
                        layer.pm.enable({ allowSelfIntersection: false })
                            ; (layer as L.Layer).on('pm:edit', () => {
                                setGeom(layer.toGeoJSON().geometry)
                            })
                        activeMode.current = 'vertices'
                    }
                },
            })
        }

        if (!toolbar.buttons['dragSelected-custom']) {
            map.pm.Toolbar.createCustomControl({
                name: 'dragSelected-custom',
                block: 'edit',
                title: 'Drag shape',
                className: 'leaflet-pm-icon-drag',
                toggle: true,
                onClick: () => {
                    const { selectedEntityId: id, layerRegistry: reg, setPendingGeometry: setGeom } = ref.current
                    if (!id) return
                    const layer = reg.current.get(id) as GeomanLayer | undefined
                    if (!layer?.pm) return

                    if (activeMode.current === 'drag') {
                        layer.pm.disableLayerDrag()
                            ; (layer as L.Layer).off('pm:dragend')
                        activeMode.current = null
                    } else {
                        // Switch from vertices if active
                        layer.pm.disable()
                            ; (layer as L.Layer).off('pm:edit')
                        // Enable drag
                        layer.pm.enableLayerDrag()
                            ; (layer as L.Layer).on('pm:dragend', () => {
                                setGeom(layer.toGeoJSON().geometry)
                            })
                        activeMode.current = 'drag'
                    }
                },
            })
        }

        if (!toolbar.buttons['deleteSelected-custom']) {
            map.pm.Toolbar.createCustomControl({
                name: 'deleteSelected-custom',
                block: 'edit',
                title: 'Delete shape',
                className: 'leaflet-pm-icon-delete',
                onClick: () => {
                    const { selectedEntityId: id, layerRegistry: reg } = ref.current

                    if (!id) return

                    const layer = reg.current.get(id) as GeomanLayer | undefined
                    if (!layer) return

                    // Remove from map and registry
                    map.removeLayer(layer)
                    reg.current.delete(id)
                },
            })
        }

        return () => {
            try { map.pm.Toolbar.removeButton('editVertices-custom') } catch { /* no-op */ }
            try { map.pm.Toolbar.removeButton('dragSelected-custom') } catch { /* no-op */ }
            try { map.pm.Toolbar.removeButton('deleteSelected-custom') } catch { }
        }
    }, [map]) // Only runs once on mount — ref keeps callbacks current

    return null
}