import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { EditMode } from "../types";

const BUTTONS = {
  EDIT_VERTICES: "geo-edit-vertices",
  MOVE:          "geo-move",
  ADD_POLYGON:   "geo-add-polygon",
  SAVE:          "geo-save",
  CANCEL:        "geo-cancel",
};

interface Props {
  editMode:         EditMode;
  editingEntityId:  string | null;
  selectedEntityId: string | null;
  onStartEdit:      (entityId: string, mode: Exclude<EditMode, "idle">) => void;
  onSaveGeometry:   () => Promise<void>;
  onCancelEdit:     () => void;
}

/**
 * Adds geometry edit controls to Geoman's native toolbar.
 * Buttons appear under the zoom controls and look consistent with
 * any other Geoman toolbar buttons. No absolute positioning needed.
 *
 * Buttons are recreated whenever the selected entity or edit mode changes
 * so their onClick closures always have fresh references.
 */
export default function MapGeometryToolbar({
  editMode,
  editingEntityId,
  selectedEntityId,
  onStartEdit,
  onSaveGeometry,
  onCancelEdit,
}: Props) {
  const map = useMap();

  // Keep a stable ref so button callbacks always read the latest props
  // without needing to recreate the buttons on every render.
  const ref = useRef({
    editMode,
    editingEntityId,
    selectedEntityId,
    onStartEdit,
    onSaveGeometry,
    onCancelEdit,
  });
  useEffect(() => {
    ref.current = {
      editMode,
      editingEntityId,
      selectedEntityId,
      onStartEdit,
      onSaveGeometry,
      onCancelEdit,
    };
  });

  // Recreate the toolbar buttons whenever the visible set changes
  // (idle with selection → three edit buttons; active edit → save + cancel).
  useEffect(() => {
    const toolbar   = map.pm.Toolbar;
    const isEditing = editMode !== "idle";
    const hasSelection = !!selectedEntityId;

    // Clean up all our buttons before rebuilding the correct set.
    Object.values(BUTTONS).forEach((name) => {
      try { toolbar.deleteControl(name); } catch { /* already absent */ }
    });

    // Nothing selected and not editing — no buttons needed.
    if (!hasSelection && !isEditing) return;

    if (isEditing && editingEntityId === selectedEntityId) {
      // ── Active edit mode: Save + Cancel ─────────────────

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
      // ── Idle with a selected entity: three edit modes ────

      toolbar.createCustomControl({
        name:      BUTTONS.EDIT_VERTICES,
        block:     "custom",
        title:     "Edit shape",
        className: "leaflet-pm-icon-edit", // leaflet/geoman default icon
        toggle:    false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start } = ref.current;
          if (id) start(id, "vertices");
        },
      });

      toolbar.createCustomControl({
        name:      BUTTONS.MOVE,
        block:     "custom",
        title:     "Move shape",
        className: "leaflet-toolbar-icon-move",
        toggle:    false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start } = ref.current;
          if (id) start(id, "drag");
        },
      });

      toolbar.createCustomControl({
        name:      BUTTONS.ADD_POLYGON,
        block:     "custom",
        title:     "Add shape",
        className: "leaflet-toolbar-icon-add",
        toggle:    false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start } = ref.current;
          if (id) start(id, "draw");
        },
      });
    }

    // Clean up buttons when dependencies change or component unmounts.
    return () => {
      Object.values(BUTTONS).forEach((name) => {
        try { toolbar.deleteControl(name); } catch { /* already absent */ }
      });
    };
  }, [map, editMode, editingEntityId, selectedEntityId]);

  return null;
}