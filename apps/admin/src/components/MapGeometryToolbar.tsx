import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { EditMode, EntityKind } from "../types";
import { CREATE_DRAW_MODE_BY_KIND } from "../types";

const BUTTONS = {
  EDIT_VERTICES: "geo-edit-vertices",
  MOVE: "geo-move",
  ADD_SHAPE: "geo-add-shape",
  SAVE: "geo-save",
  CANCEL: "geo-cancel",
};

// Per-kind labels for the create flow's "Add …" and "Save …" buttons.
const CREATE_LABELS: Record<EntityKind, { title: string; className: string; }> = {
  poi: { title: "Add POI", className: "leaflet-pm-icon-marker" },
  road: { title: "Add road", className: "leaflet-pm-icon-polyline" },
  area: { title: "Add area", className: "leaflet-pm-icon-polygon" },
};
interface Props {
  editMode: EditMode;
  editingEntityId: string | null;
  selectedEntityId: string | null;
  selectedEntityType: EntityKind | null;
  onStartEdit: (entityId: string, mode: Exclude<EditMode, "idle">) => void;
  onSaveGeometry: () => Promise<void>;
  onCancelEdit: () => void;
  creatingKind: EntityKind | null;
  onStartCreate: () => void;
}

/**
 * Adds geometry edit controls to Geoman's native toolbar. Shows different
 * button sets depending on:
 *  - a create flow being active (creatingKind), or
 *  - an existing entity being selected (selectedEntityType).
 */
export default function MapGeometryToolbar({
  editMode,
  editingEntityId,
  selectedEntityId,
  selectedEntityType,
  onStartEdit,
  onSaveGeometry,
  onCancelEdit,
  creatingKind,
  onStartCreate,
}: Props) {
  const map = useMap();

  // Stable ref so button callbacks always read the latest props
  // without needing to recreate buttons on every render.
  const ref = useRef({
    editMode, editingEntityId, selectedEntityId, selectedEntityType,
    onStartEdit, onSaveGeometry, onCancelEdit,
    creatingKind, onStartCreate,
  });
  useEffect(() => {
    ref.current = {
      editMode, editingEntityId, selectedEntityId, selectedEntityType,
      onStartEdit, onSaveGeometry, onCancelEdit,
      creatingKind, onStartCreate,
    };
  });

  useEffect(() => {
    const toolbar = map.pm.Toolbar;
    const isEditing = editMode !== "idle";
    const hasSelection = !!selectedEntityId && selectedEntityType !== null;

    // A create flow's draw session is "active" once the user has clicked
    // "Add …" and is mid-draw (editingEntityId is always null during create).
    const isCreatingActive =
      creatingKind !== null &&
      editMode === CREATE_DRAW_MODE_BY_KIND[creatingKind] &&
      editingEntityId === null;

    Object.values(BUTTONS).forEach((name) => {
      try { toolbar.deleteControl(name); } catch { /* already absent */ }
    });

    // ── Create flow (POI, Road, or later Area) ────────────
    if (creatingKind) {
      const labels = CREATE_LABELS[creatingKind];

      if (isCreatingActive) {
        toolbar.createCustomControl({
          name: BUTTONS.SAVE,
          block: "custom",
          title: "Save",
          className: "leaflet-toolbar-icon-save",
          toggle: false,
          onClick: () => { void ref.current.onSaveGeometry(); },
        });
        toolbar.createCustomControl({
          name: BUTTONS.CANCEL,
          block: "custom",
          title: "Cancel (Esc)",
          className: "leaflet-toolbar-icon-cancel",
          toggle: false,
          onClick: () => { ref.current.onCancelEdit(); },
        });
      } else {
        toolbar.createCustomControl({
          name: BUTTONS.ADD_SHAPE,
          block: "custom",
          title: labels.title,
          className: labels.className,
          toggle: false,
          onClick: () => { ref.current.onStartCreate(); },
        });
      }

      return () => {
        Object.values(BUTTONS).forEach((name) => {
          try { toolbar.deleteControl(name); } catch { /* already absent */ }
        });
      };
    }

    // ── Existing selection (edit an already-saved entity) ─
    if (!hasSelection && !isEditing) return;

    if (isEditing && editingEntityId === selectedEntityId) {
      toolbar.createCustomControl({
        name: BUTTONS.SAVE,
        block: "custom",
        title: "Save",
        className: "leaflet-toolbar-icon-save",
        toggle: false,
        onClick: () => { void ref.current.onSaveGeometry(); },
      });
      toolbar.createCustomControl({
        name: BUTTONS.CANCEL,
        block: "custom",
        title: "Cancel (Esc)",
        className: "leaflet-toolbar-icon-cancel",
        toggle: false,
        onClick: () => { ref.current.onCancelEdit(); },
      });
    } else if (!isEditing && hasSelection) {
      const labels = CREATE_LABELS[selectedEntityType];
      const type = selectedEntityType;

      toolbar.createCustomControl({
        name: BUTTONS.EDIT_VERTICES,
        block: "custom",
        title: type === "road" ? "Edit road" : type === "poi" ? "Move POI(s)" : "Edit shape",
        className: type === "poi" ? "leaflet-toolbar-icon-move" : "leaflet-pm-icon-edit",
        toggle: false,
        onClick: () => {
          const { selectedEntityId: id, onStartEdit: start, selectedEntityType: t } = ref.current;
          if (!id) return;
          start(id, t === "road" ? "editLine" : t === "poi" ? "movePOI" : "vertices");
        },
      });

      if (type !== "poi") {
        toolbar.createCustomControl({
          name: BUTTONS.MOVE,
          block: "custom",
          title: type === "road" ? "Move road(s)" : "Move shape(s)",
          className: "leaflet-toolbar-icon-move",
          toggle: false,
          onClick: () => {
            const { selectedEntityId: id, onStartEdit: start, selectedEntityType: t } = ref.current;
            if (!id) return;
            start(id, t === "road" ? "dragLine" : "drag");
          },
        });
      }

      toolbar.createCustomControl({
        name: BUTTONS.ADD_SHAPE,
        block: "custom",
        title: labels.title,
        className: labels.className,
        toggle: false,
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
  }, [map, editMode, editingEntityId, selectedEntityId, selectedEntityType, creatingKind]);

  return null;
}