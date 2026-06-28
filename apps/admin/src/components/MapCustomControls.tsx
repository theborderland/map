import { useMap } from "react-leaflet"
import { useMapStore } from "../store/mapStore"
import { useEffect, useRef } from "react"
import L from "leaflet"

const BUTTONS = {
    EDIT_SHAPE: "editVertices-custom",
    MOVE_SHAPE: "dragSelected-custom",
    DELETE_SHAPE: "deleteSelected-custom"
}

type GeomanLayer = L.Layer & {
    pm: {
        enable: (opts?: { allowSelfIntersection?: boolean }) => void
        disable: () => void
        enableLayerDrag: () => void
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
    const map = useMap();
    const { isEditing, originalGeometry, setPendingGeometry } = useMapStore();
    // Track active sub-mode locally — just needed for the toggle behaviour
    const activeMode = useRef<'vertices' | 'drag' | null>(null);

    // Always-current ref so Geoman button callbacks never have stale closures
    const ref = useRef({ selectedEntityId, layerRegistry, setPendingGeometry });
    useEffect(() => {
        ref.current = { selectedEntityId, layerRegistry, setPendingGeometry };
    });

    // Clean up when user hits Save or Cancel
    useEffect(() => {
        if (isEditing) return;

        const { selectedEntityId: id, layerRegistry: reg } = ref.current;
        if (!id) return;

        const layer = reg.current.get(id) as GeomanLayer | undefined;
        if (!layer) return;

        layer.pm.disable();
        layer.pm.disableLayerDrag();
        (layer as L.Layer).off('pm:edit');
        (layer as L.Layer).off('pm:dragend');
        activeMode.current = null;

        map.pm.Toolbar.buttons[BUTTONS.EDIT_SHAPE].toggle(false);
        map.pm.Toolbar.buttons[BUTTONS.MOVE_SHAPE].toggle(false);


        /** 
         * Restore original geometry if it exists (i.e. cancel was pressed)
         * 
         * Quite advanced way to restore, but I tried with re-rendering by
         * triggering a React state update with original geometry, but it 
         * just got messy because react saw the same <GeoJSON> component
         * with same key and didn't remount it.
         * React tries to diff and update the existing Leaflet layer in place, 
         * which doesn't work because Leaflet manages the DOM directly.
         * 
         * But in the end the code go too messy.
         * This here works and is in only one place. 
         * */
        if (originalGeometry) {
            const geoJsonLayer = layer as unknown as L.GeoJSON

            if (typeof geoJsonLayer.clearLayers === 'function') {
                // L.GeoJSON layer group
                geoJsonLayer.clearLayers()
                geoJsonLayer.addData(originalGeometry as GeoJSON.GeoJsonObject)

            } else if (originalGeometry.type === 'Point') {
                // CircleMarker — uses setLatLng (singular)
                const coords = (originalGeometry as GeoJSON.Point).coordinates
                const latlng = L.latLng(coords[1]!, coords[0]!)
                const marker = layer as unknown as L.CircleMarker
                marker.setLatLng(latlng)
                marker.redraw()

            } else {
                // Polygon / LineString / MultiLineString — uses setLatLngs (plural)
                const path = layer as unknown as L.Path & {
                    setLatLngs: (latlngs: L.LatLngExpression[] | L.LatLngExpression[][]) => void
                }
                const restored = L.geoJSON(originalGeometry)
                const restoredLayer = restored.getLayers()[0] as L.Path & {
                    getLatLngs: () => L.LatLng[] | L.LatLng[][]
                }
                path.setLatLngs(restoredLayer.getLatLngs())
                path.redraw()
            }
        }
    }, [isEditing, originalGeometry])

    useEffect(() => {
        const toolbar = map.pm.Toolbar;

        if (!toolbar.buttons[BUTTONS.EDIT_SHAPE]) {
            map.pm.Toolbar.createCustomControl({
                name: BUTTONS.EDIT_SHAPE,
                block: 'edit',
                title: 'Edit shape',
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

        if (!toolbar.buttons[BUTTONS.MOVE_SHAPE]) {
            map.pm.Toolbar.createCustomControl({
                name: BUTTONS.MOVE_SHAPE,
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

        if (!toolbar.buttons[BUTTONS.DELETE_SHAPE]) {
            map.pm.Toolbar.createCustomControl({
                name: BUTTONS.DELETE_SHAPE,
                block: 'edit',
                title: 'Delete shape',
                className: 'leaflet-pm-icon-trash',
                onClick: () => {
                    const { selectedEntityId: id, layerRegistry: reg } = ref.current

                    if (!id) return

                    const layer = reg.current.get(id) as GeomanLayer | undefined
                    if (!layer) return

                    // Remove from map and registry
                    map.removeLayer(layer)
                    reg.current.delete(id)
                },
                afterClick: () => {
                    map.pm.Toolbar.buttons[BUTTONS.DELETE_SHAPE].toggle(false);
                }
            })
        }

        return () => {
            try { map.pm.Toolbar.removeButton(BUTTONS.EDIT_SHAPE) } catch { }
            try { map.pm.Toolbar.removeButton(BUTTONS.MOVE_SHAPE) } catch { }
            try { map.pm.Toolbar.removeButton(BUTTONS.DELETE_SHAPE) } catch { }
        }
    }, [map]) // Only runs once on mount — ref keeps callbacks current

    return null
}