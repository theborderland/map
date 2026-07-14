import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { EditMode } from "../types";

const BUTTONS = {
  EDIT_VERTICES: "geo-edit-vertices",
  MOVE:          "geo-move",
  ADD_SHAPE:     "geo-add-shape",
  SAVE:          "geo-save",
  CANCEL:        "geo-cancel",
};

type EntityType = "area" | "road" | "poi" | null;

interface Props {
  editMode:           EditMode;
  editingEntityId:    string | null;
  selectedEntityId:   string | null;
  selectedEntityType: EntityType;
  onStartEdit:        (entityId: string, mode: Exclude<EditMode, "idle">) => void;
  onSaveGeometry:     () => Promise<void>;
  onCancelEdit:       () => void;
}

/**
 * Adds geometry edit controls to Geoman's native toolbar.
 * Shows area or road specific buttons depending on the selected entity type.
 * Uses only valid leaflet-pm-icon-* class names so buttons render correctly.
 */
export default function MapGeometryToolbar({
  editMode,
  editingEntityId,
  selectedEntityId,
  selectedEntityType,
  onStartEdit,
  onSaveGeometry,
  onCancelEdit,
}: Props) {
  const map = useMap();

  // Stable ref so button callbacks always read the latest props
  // without needing to recreate buttons on every render.
  const ref = useRef({
    editMode,
    editingEntityId,
    selectedEntityId,
    selectedEntityType,
    onStartEdit,
    onSaveGeometry,
    onCancelEdit,
  });
  useEffect(() => {
    ref.current = {
      editMode,
      editingEntityId,
      selectedEntityId,
      selectedEntityType,
      onStartEdit,
      onSaveGeometry,
      onCancelEdit,
    };
  });

  useEffect(() => {
    const toolbar      = map.pm.Toolbar;
    const isEditing    = editMode !== "idle";
    const hasSelection = !!selectedEntityId && selectedEntityType !== null;

    // Remove all our buttons before rebuilding the correct set.
    Object.values(BUTTONS).forEach((name) => {
      try { toolbar.deleteControl(name); } catch { /* already absent */ }
    });

    if (!hasSelection && !isEditing) return;

    if (isEditing && editingEntityId === selectedEntityId) {
      // ── Active edit: Save + Cancel ───────────────────────
      toolbar.createCustomControl({
        name:      BUTTONS.SAVE,
        block:     "custom",
        title:     "Save changes",
        className: "leaflet-toolbar-icon-save",
        toggle:    false,
        onClick: () => { void ref.current.onSaveGeometry(); },
      });

      toolbar.createCustomControl({
        name:      BUTTONS.CANCEL,
        block:     "custom",
        title:     "Cancel edit (Esc)",
        className: "leaflet-toolbar-icon-cancel",
        toggle:    false,
        onClick: () => { ref.current.onCancelEdit(); },
      });

    } else if (!isEditing && hasSelection) {
      const type = selectedEntityType;

      // POIs don't have a vertex-edit mode so MOVE maps to their primary action above.
      // Only show the separate Move button for areas and roads.
      if (type !== "poi") {
      toolbar.createCustomControl({
        name:      BUTTONS.EDIT_VERTICES,
        block:     "custom",
        title:     type === "road" ? "Edit line"
                 : "Edit vertices",
        className: "leaflet-pm-icon-edit",
        toggle:    false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start, selectedEntityType: t } = ref.current;
          if (!id) return;
          start(id, t === "road" ? "editLine" : "vertices");
        },
      });
    }
      
        toolbar.createCustomControl({
          name:      BUTTONS.MOVE,
          block:     "custom",
          title:     type === "road" ? "Move line" 
                    : type === "poi"  ? "Move point(s)"
                    : "Move shape",
          className: "leaflet-toolbar-icon-move",
          toggle:    false,
          onClick: () => {
            const { selectedEntityId: id, onStartEdit: start, selectedEntityType: t } = ref.current;
            if (!id) return;
            start(id, t === "road" ? "dragLine" : t === "poi" ? "movePOI" : "drag");
          },
        });

      toolbar.createCustomControl({
        name:      BUTTONS.ADD_SHAPE,
        block:     "custom",
        title:     type === "road" ? "Add line"
                 : type === "poi"  ? "Add point"
                 : "Add shape",
        className: type === "road" ? "leaflet-pm-icon-polyline" 
                  : type == "poi" ? "leaflet-pm-icon-marker"
                  : "leaflet-pm-icon-polygon",
        toggle:    false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start, selectedEntityType: t } = ref.current;
          if (!id) return;
          start(id, t === "road" ? "drawLine" : t === "poi" ? "drawPOI" : "draw");
        },
      });
    }

    // Clean up buttons when dependencies change or component unmounts.
    return () => {
      Object.values(BUTTONS).forEach((name) => {
        try { toolbar.deleteControl(name); } catch { /* already absent */ }
      });
    };
  }, [map, editMode, editingEntityId, selectedEntityId, selectedEntityType]);

  return null;
}